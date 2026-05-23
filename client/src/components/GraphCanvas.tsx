import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type CSSProperties,
} from "react";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import type { GraphData, GraphEdge, GraphNode } from "../types";
import { DRAG_MIME } from "./FileExplorer";

cytoscape.use(dagre);

type CySnapshot = ReturnType<Core["json"]>;

const FIT_PADDING = 40;
const CODE_PREVIEW_LINES = 6;

function truncateCode(code: string, maxLines = CODE_PREVIEW_LINES): string {
  return code
    .split("\n")
    .slice(0, maxLines)
    .join("\n")
    .slice(0, 400);
}

function edgeElementId(edge: GraphEdge): string {
  return `edge:${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`;
}

function graphToElements(
  data: GraphData,
  expandedMethods: Set<string>,
): ElementDefinition[] {
  const visibleNodes = data.nodes.filter((n) => n.type !== "file");
  const nodeIds = new Set(visibleNodes.map((n) => n.id));

  const parents = visibleNodes.filter((n) => !n.parent || !nodeIds.has(n.parent));
  const children = visibleNodes.filter((n) => n.parent && nodeIds.has(n.parent));
  const ordered = [...parents, ...children];

  const nodeElements: ElementDefinition[] = ordered.map((node) => {
    const isMethodLike = node.type === "method" || node.type === "function";
    const expanded = isMethodLike && expandedMethods.has(node.id);
    const displayLabel = expanded
      ? `${node.label}\n${truncateCode(node.code)}`
      : node.label;

    return {
      data: {
        id: node.id,
        label: node.label,
        displayLabel,
        type: node.type,
        filePath: node.filePath,
        code: node.code,
        parent: node.parent && nodeIds.has(node.parent) ? node.parent : undefined,
        expanded: expanded ? "true" : "false",
      },
    };
  });

  const edgeElements: ElementDefinition[] = data.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((edge) => ({
      data: {
        id: edgeElementId(edge),
        source: edge.source,
        target: edge.target,
        type: edge.type,
        edgeLabel: edge.label ?? "",
      },
    }));

  return [...nodeElements, ...edgeElements];
}

function runLayout(cy: Core) {
  const layout = cy.layout({
    name: "dagre",
    rankDir: "TB",
    nodeSep: 60,
    rankSep: 80,
    animate: false,
  });
  layout.on("layoutstop", () => {
    cy.resize();
    cy.fit(undefined, FIT_PADDING);
  });
  layout.run();
}

export interface GraphCanvasHandle {
  pushHistoryBeforeChange: () => void;
  getSnapshot: () => CySnapshot | null;
}

interface GraphCanvasProps {
  graphData: GraphData | null;
  graphResetKey: number;
  onFileDrop: (filePath: string) => void;
  loading?: boolean;
}

const controlButtonStyle: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #555",
  borderRadius: 4,
  background: "rgba(22, 33, 62, 0.92)",
  color: "#eee",
  cursor: "pointer",
  fontSize: 13,
};

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas({ graphData, graphResetKey, onFileDrop, loading }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const historyRef = useRef<CySnapshot[]>([]);
    const expandedMethodsRef = useRef<Set<string>>(new Set());
    const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
    const [canGoBack, setCanGoBack] = useState(false);
    const [pathInfo, setPathInfo] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      nodeId: string;
    } | null>(null);
    const [pathFromId, setPathFromId] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      pushHistoryBeforeChange: () => {
        const cy = cyRef.current;
        if (!cy || cy.elements().length === 0) return;
        historyRef.current.push(cy.json());
        setCanGoBack(historyRef.current.length > 0);
      },
      getSnapshot: () => {
        const cy = cyRef.current;
        return cy && cy.elements().length > 0 ? cy.json() : null;
      },
    }));

    const clearPathHighlight = useCallback((cy: Core) => {
      cy.elements().removeClass("path-highlight");
    }, []);

    const highlightPath = useCallback(
      (cy: Core, nodeIds: string[], edgeIds: string[]) => {
        clearPathHighlight(cy);
        for (const id of nodeIds) {
          cy.getElementById(id).addClass("path-highlight");
        }
        for (const id of edgeIds) {
          cy.getElementById(id).addClass("path-highlight");
        }
      },
      [clearPathHighlight],
    );

    const findShortestPath = useCallback((cy: Core, fromId: string, toId: string) => {
      if (fromId === toId) return { nodeIds: [fromId], edgeIds: [] as string[] };

      const adj = new Map<string, { neighbor: string; edgeId: string }[]>();
      cy.edges().forEach((edge) => {
        const a = edge.source().id();
        const b = edge.target().id();
        const eid = edge.id();
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push({ neighbor: b, edgeId: eid });
        adj.get(b)!.push({ neighbor: a, edgeId: eid });
      });

      const queue: string[] = [fromId];
      const prev = new Map<string, { node: string; edgeId: string } | null>();
      prev.set(fromId, null);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === toId) break;
        for (const { neighbor, edgeId } of adj.get(current) ?? []) {
          if (prev.has(neighbor)) continue;
          prev.set(neighbor, { node: current, edgeId });
          queue.push(neighbor);
        }
      }

      if (!prev.has(toId)) return null;

      const nodeIds: string[] = [];
      const edgeIds: string[] = [];
      let cur: string | null = toId;
      while (cur) {
        nodeIds.unshift(cur);
        const p = prev.get(cur);
        if (p) {
          edgeIds.unshift(p.edgeId);
          cur = p.node;
        } else {
          cur = null;
        }
      }
      return { nodeIds, edgeIds };
    }, []);

    const applyGraphData = useCallback(
      (cy: Core, data: GraphData | null) => {
        cy.elements().remove();
        setPathInfo(null);
        setPathFromId(null);
        clearPathHighlight(cy);

        if (!data || data.nodes.length === 0) return;

        const elements = graphToElements(data, expandedMethodsRef.current);
        cy.add(elements);
        runLayout(cy);
      },
      [clearPathHighlight],
    );

    useEffect(() => {
      expandedMethodsRef.current = new Set();
      setExpandedMethods(new Set());
    }, [graphResetKey]);

    useEffect(() => {
      expandedMethodsRef.current = expandedMethods;
      const cy = cyRef.current;
      if (!cy || !graphData) return;
      applyGraphData(cy, graphData);
    }, [expandedMethods, graphData, applyGraphData]);

    useEffect(() => {
      if (!containerRef.current) return;

      const cy = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: "node",
            style: {
              shape: "round-rectangle",
              "text-valign": "center",
              "text-halign": "center",
              color: "#fff",
              "font-size": "11px",
              "font-family": "ui-monospace, monospace",
              "text-wrap": "wrap",
              "text-max-width": "140px",
              padding: "8px",
            },
          },
          {
            selector: ':parent[type = "class"], :parent[type = "module"]',
            style: {
              "background-color": "#2c3e50",
              "background-opacity": 0.95,
              "border-color": "#E8A838",
              "border-width": 2,
              label: "data(label)",
              "text-valign": "top",
              "text-halign": "center",
              "font-size": "13px",
              "font-weight": "bold",
              color: "#f5d78e",
              padding: "16px",
              "min-width": "120px",
              "min-height": "60px",
            },
          },
          {
            selector: 'node[type = "method"], node[type = "function"]',
            style: {
              "background-color": "#3d2a52",
              "border-color": "#9B59B6",
              "border-width": 1,
              label: "data(displayLabel)",
              width: 140,
              height: "label",
              "min-height": 28,
            },
          },
          {
            selector: 'node[expanded = "true"]',
            style: {
              width: 200,
              "min-height": 80,
              "font-size": "10px",
              "text-halign": "left",
              "text-margin-x": 6,
            },
          },
          {
            selector: "node.path-highlight",
            style: {
              "border-color": "#ffcc00",
              "border-width": 4,
              "background-color": "#4a4020",
            },
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#888",
              "target-arrow-color": "#888",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(edgeLabel)",
              "font-size": "10px",
              color: "#ccc",
              "text-background-color": "#1a1a2e",
              "text-background-opacity": 0.85,
              "text-background-padding": "2px",
            },
          },
          {
            selector: 'edge[type = "imports"]',
            style: {
              "line-color": "#4A90D9",
              "target-arrow-color": "#4A90D9",
            },
          },
          {
            selector: "edge.path-highlight",
            style: {
              width: 4,
              "line-color": "#ffcc00",
              "target-arrow-color": "#ffcc00",
            },
          },
        ],
        layout: { name: "grid" },
      });

      cy.on("cxttap", "node", (evt) => {
        evt.originalEvent.preventDefault();
        const node = evt.target;
        const rendered = node.renderedPosition();
        const pan = cy.pan();
        const zoom = cy.zoom();
        const rect = containerRef.current!.getBoundingClientRect();
        setContextMenu({
          x: rect.left + rendered.x * zoom + pan.x,
          y: rect.top + rendered.y * zoom + pan.y,
          nodeId: node.id(),
        });
      });

      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        const type = node.data("type");

        if (pathFromId) {
          const path = findShortestPath(cy, pathFromId, node.id());
          setPathFromId(null);
          if (path) {
            highlightPath(cy, path.nodeIds, path.edgeIds);
            const labels = path.nodeIds.map((id) => cy.getElementById(id).data("label"));
            setPathInfo(`Path: ${labels.join(" → ")}`);
          } else {
            setPathInfo("No path found between nodes");
          }
          return;
        }

        if (type === "method" || type === "function") {
          const id = node.id();
          setExpandedMethods((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            expandedMethodsRef.current = next;
            return next;
          });
          if (graphData) {
            applyGraphData(cy, graphData);
          }
        }
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          setContextMenu(null);
          if (!pathFromId) setPathInfo(null);
        }
      });

      cyRef.current = cy;

      const wrapper = wrapperRef.current;
      const observer =
        wrapper &&
        new ResizeObserver(() => {
          cy.resize();
        });
      if (wrapper && observer) observer.observe(wrapper);

      return () => {
        observer?.disconnect();
        cy.destroy();
        cyRef.current = null;
      };
    }, [applyGraphData, findShortestPath, graphData, highlightPath, pathFromId]);

    const handleBack = () => {
      const cy = cyRef.current;
      const snapshot = historyRef.current.pop();
      setCanGoBack(historyRef.current.length > 0);
      if (!cy || !snapshot) return;
      cy.json(snapshot);
      cy.resize();
      cy.fit(undefined, FIT_PADDING);
      setPathInfo(null);
      setPathFromId(null);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const filePath = e.dataTransfer.getData(DRAG_MIME);
      if (filePath) onFileDrop(filePath);
    };

    const isEmpty = !graphData || graphData.nodes.filter((n) => n.type !== "file").length === 0;

    return (
      <div
        ref={wrapperRef}
        style={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleDrop}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #333",
            background: "#12121f",
            zIndex: 5,
          }}
        >
          <button
            type="button"
            style={{
              ...controlButtonStyle,
              opacity: canGoBack ? 1 : 0.4,
              cursor: canGoBack ? "pointer" : "not-allowed",
            }}
            disabled={!canGoBack}
            onClick={handleBack}
          >
            ← Back
          </button>
          {loading && <span style={{ fontSize: 13, color: "#9ab" }}>Loading…</span>}
        </div>

        {pathInfo && (
          <div
            style={{
              position: "absolute",
              top: 52,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 20,
              background: "rgba(30, 40, 70, 0.95)",
              border: "1px solid #ffcc00",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              color: "#ffeb99",
              pointerEvents: "none",
            }}
          >
            {pathInfo}
          </div>
        )}

        {pathFromId && (
          <div
            style={{
              position: "absolute",
              top: 52,
              right: 12,
              zIndex: 20,
              fontSize: 12,
              color: "#9cf",
            }}
          >
            Click target node…
          </div>
        )}

        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <div
            ref={containerRef}
            style={{ position: "absolute", inset: 0, background: "#1a1a2e" }}
          />
          {isEmpty && !loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: 18,
                pointerEvents: "none",
              }}
            >
              ← Click or drag a file to start
            </div>
          )}
        </div>

        {contextMenu && (
          <div
            style={{
              position: "fixed",
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 100,
              background: "#1e2a44",
              border: "1px solid #555",
              borderRadius: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              minWidth: 160,
            }}
          >
            <button
              type="button"
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                color: "#eee",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 13,
              }}
              onClick={() => {
                setPathFromId(contextMenu.nodeId);
                setContextMenu(null);
                setPathInfo(null);
                const cy = cyRef.current;
                if (cy) clearPathHighlight(cy);
              }}
            >
              Find path to…
            </button>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            title="Fit to screen"
            style={controlButtonStyle}
            onClick={() => {
              const cy = cyRef.current;
              if (cy && cy.elements().length > 0) cy.fit(undefined, FIT_PADDING);
            }}
          >
            ⊡
          </button>
        </div>
      </div>
    );
  },
);

export default GraphCanvas;
