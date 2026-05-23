import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Maximize2 } from "lucide-react";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition, Stylesheet } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getGraphTheme, type GraphThemeColors } from "@/lib/cytoscapeTheme";
import { cn } from "@/lib/utils";
import type { GraphData, GraphEdge } from "../types";
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

function buildCyStyles(theme: GraphThemeColors): Stylesheet[] {
  return [
    {
      selector: "node",
      style: {
        shape: "round-rectangle",
        "text-valign": "center",
        "text-halign": "center",
        color: theme.foreground,
        "font-size": "11px",
        "font-family": "ui-monospace, monospace",
        "text-wrap": "wrap",
        "text-max-width": "140px",
        "background-color": theme.card,
        "border-color": theme.border,
        "border-width": 1,
        padding: "8px",
      },
    },
    {
      selector: ':parent[type = "class"], :parent[type = "module"]',
      style: {
        "background-color": theme.card,
        "background-opacity": 0.98,
        "border-color": theme.primary,
        "border-width": 2,
        label: "data(label)",
        "text-valign": "top",
        "text-halign": "center",
        "font-size": "13px",
        "font-weight": "bold",
        color: theme.primary,
        padding: "16px",
        "min-width": "120px",
        "min-height": "60px",
      },
    },
    {
      selector: 'node[type = "method"], node[type = "function"]',
      style: {
        "background-color": theme.muted,
        "border-color": theme.border,
        "border-width": 1,
        label: "data(displayLabel)",
        color: theme.foreground,
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
        color: theme.mutedForeground,
      },
    },
    {
      selector: "node.selected",
      style: {
        "border-color": theme.ring,
        "border-width": 3,
        "overlay-color": theme.ring,
        "overlay-opacity": 0.2,
        "overlay-padding": 6,
      },
    },
    {
      selector: "node.path-highlight",
      style: {
        "border-color": theme.ring,
        "border-width": 4,
        "overlay-color": theme.ring,
        "overlay-opacity": 0.35,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": theme.mutedForeground,
        "target-arrow-color": theme.mutedForeground,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(edgeLabel)",
        "font-size": "10px",
        color: theme.foreground,
        "text-background-color": theme.card,
        "text-background-opacity": 0.9,
        "text-background-padding": "2px",
      },
    },
    {
      selector: 'edge[type = "imports"]',
      style: {
        "line-color": theme.primary,
        "target-arrow-color": theme.primary,
      },
    },
    {
      selector: "edge.path-highlight",
      style: {
        width: 4,
        "line-color": theme.ring,
        "target-arrow-color": theme.ring,
      },
    },
  ];
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

interface NodeTipState {
  label: string;
  type: string;
  filePath: string;
  x: number;
  y: number;
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas({ graphData, graphResetKey, onFileDrop, loading }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const historyRef = useRef<CySnapshot[]>([]);
    const expandedMethodsRef = useRef<Set<string>>(new Set());
    const prevGraphKeyRef = useRef(-1);
    const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
    const [canGoBack, setCanGoBack] = useState(false);
    const [pathInfo, setPathInfo] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      nodeId: string;
    } | null>(null);
    const [pathFromId, setPathFromId] = useState<string | null>(null);
    const [nodeTip, setNodeTip] = useState<NodeTipState | null>(null);

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
        if (graphKey !== prevGraphKeyRef.current) {
          cy.elements().remove();
          prevGraphKeyRef.current = graphKey;
        }

        cy.nodes().removeClass("selected");
        setPathInfo(null);
        setPathFromId(null);
        clearPathHighlight(cy);

        if (!data || data.nodes.length === 0) return;

        const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
        const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
        const elements = graphToElements(data, expandedMethodsRef.current);
        const newElements: ElementDefinition[] = [];

        for (const el of elements) {
          if (el.data.id?.startsWith("edge:")) {
            if (!existingEdgeIds.has(el.data.id)) newElements.push(el);
          } else if (!existingNodeIds.has(el.data.id!)) {
            newElements.push(el);
          } else if (!el.data.id!.startsWith("edge:")) {
            const node = cy.getElementById(el.data.id!);
            node.data(el.data);
          }
        }

        if (newElements.length > 0) cy.add(newElements);
        runLayout(cy);
      },
      [clearPathHighlight, graphResetKey],
    );

    const graphKey = graphResetKey;

    useEffect(() => {
      expandedMethodsRef.current = new Set();
      setExpandedMethods(new Set());
    }, [graphResetKey]);

    useEffect(() => {
      expandedMethodsRef.current = expandedMethods;
      const cy = cyRef.current;
      if (!cy || !graphData) return;

      if (graphKey !== prevGraphKeyRef.current) {
        cy.elements().remove();
        prevGraphKeyRef.current = graphKey;
        const elements = graphToElements(graphData, expandedMethodsRef.current);
        cy.add(elements);
        runLayout(cy);
        return;
      }

      applyGraphData(cy, graphData);
    }, [expandedMethods, graphData, graphKey, applyGraphData]);

    useEffect(() => {
      if (!containerRef.current) return;

      const theme = getGraphTheme();
      const cy = cytoscape({
        container: containerRef.current,
        style: buildCyStyles(theme),
        layout: { name: "grid" },
      });

      const updateNodeTip = (evt: cytoscape.EventObject) => {
        const node = evt.target;
        const rect = containerRef.current!.getBoundingClientRect();
        const pos = node.renderedPosition();
        const pan = cy.pan();
        const zoom = cy.zoom();
        setNodeTip({
          label: node.data("label"),
          type: node.data("type"),
          filePath: node.data("filePath"),
          x: rect.left + pos.x * zoom + pan.x,
          y: rect.top + pos.y * zoom + pan.y,
        });
      };

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

      cy.on("mouseover", "node", updateNodeTip);
      cy.on("mouseout", "node", () => setNodeTip(null));

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
          return;
        }

        cy.nodes().removeClass("selected");
        node.addClass("selected");
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
    }, [findShortestPath, highlightPath, pathFromId]);

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

    const isEmpty =
      !graphData || graphData.nodes.filter((n) => n.type !== "file").length === 0;

    return (
      <div
        ref={wrapperRef}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleDrop}
      >
        <div className="z-5 flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGoBack}
            onClick={handleBack}
          >
            ← Back
          </Button>
          {loading && (
            <span className="text-sm text-muted-foreground">Loading…</span>
          )}
        </div>

        {pathInfo && (
          <div className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2 rounded-md border border-ring bg-popover px-3.5 py-2 text-sm text-popover-foreground shadow-md">
            {pathInfo}
          </div>
        )}

        {pathFromId && (
          <p className="absolute top-14 right-3 z-20 text-xs text-muted-foreground">
            Click target node…
          </p>
        )}

        <div className="relative min-h-0 flex-1">
          <div ref={containerRef} className="absolute inset-0 bg-background" />
          {isEmpty && !loading && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-muted-foreground">
              ← Click or drag a file to start
            </p>
          )}
        </div>

        {contextMenu && (
          <div
            className="fixed z-100 min-w-40 rounded-md border border-border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setPathFromId(contextMenu.nodeId);
                setContextMenu(null);
                setPathInfo(null);
                const cy = cyRef.current;
                if (cy) clearPathHighlight(cy);
              }}
            >
              Find path to…
            </Button>
          </div>
        )}

        {nodeTip && (
          <Tooltip open>
            <TooltipTrigger
              render={
                <span
                  className="pointer-events-none fixed size-px"
                  style={{ left: nodeTip.x, top: nodeTip.y }}
                />
              }
            />
            <TooltipContent
              side="top"
              className="max-w-xs font-mono text-xs"
              style={{ position: "fixed", left: nodeTip.x, top: nodeTip.y - 8 }}
            >
              <p className="font-sans font-medium">{nodeTip.label}</p>
              <p className="text-muted-foreground">{nodeTip.type}</p>
              <p className="truncate text-muted-foreground">{nodeTip.filePath}</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Fit to screen"
            aria-label="Fit to screen"
            onClick={() => {
              const cy = cyRef.current;
              if (cy && cy.elements().length > 0) cy.fit(undefined, FIT_PADDING);
            }}
          >
            <Maximize2 />
          </Button>
        </div>
      </div>
    );
  },
);

export default GraphCanvas;
