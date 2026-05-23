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
import type { Core, ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Button } from "@/components/ui/button";
import { readFitPadding, runGraphLayout } from "@/lib/compoundLayout";
import {
  getGraphTheme,
  readTailwindMinSize,
  readTailwindSpacing,
  type GraphThemeColors,
} from "@/lib/cytoscapeTheme";
import { graphToElements } from "@/lib/graphElements";
import type { GraphData } from "../types";

cytoscape.use(dagre);

type CySnapshot = Parameters<Core["json"]>[0];

function readFontSize(className: string): string {
  const probe = document.createElement("div");
  probe.className = className;
  document.documentElement.appendChild(probe);
  const size = getComputedStyle(probe).fontSize;
  document.documentElement.removeChild(probe);
  return size;
}

function buildCyStyles(theme: GraphThemeColors) {
  const textXs = readFontSize("text-xs");
  const textSm = readFontSize("text-sm");
  const pad2 = readTailwindSpacing("p-2");
  const pad5 = readTailwindSpacing("p-5");

  return [
    {
      selector: "node",
      style: {
        shape: "round-rectangle",
        "text-valign": "center",
        "text-halign": "center",
        color: theme.foreground,
        "font-size": textXs,
        "font-family": "ui-monospace, monospace",
        "text-wrap": "wrap",
        "background-color": theme.card,
        "border-color": theme.border,
        "border-width": 1,
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
        "text-halign": "left",
        "font-size": textSm,
        "font-weight": "bold",
        color: theme.primary,
        padding: pad5,
        "min-width": readTailwindMinSize("min-w-48", "minWidth"),
        "min-height": readTailwindMinSize("min-h-16", "minHeight"),
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
        "text-valign": "top",
        "text-halign": "left",
        "font-size": textXs,
        "font-family": "ui-monospace, monospace",
        "text-margin-x": pad2,
        "text-margin-y": pad2,
        width: "label",
        height: "label",
        "min-height": readTailwindMinSize("min-h-7", "minHeight"),
      },
    },
    {
      selector: 'node[expanded = "true"]',
      style: {
        "text-halign": "left",
        "text-valign": "top",
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
        "overlay-padding": readTailwindSpacing("p-1.5"),
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
        "font-size": textXs,
        color: theme.foreground,
        "text-background-color": theme.card,
        "text-background-opacity": 0.9,
        "text-background-padding": readTailwindSpacing("p-1"),
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
  function GraphCanvas({ graphData, graphResetKey, onFileDrop: _onFileDrop, loading }, ref) {
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
    const [graphError, setGraphError] = useState<string | null>(null);

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

    const syncGraph = useCallback((cy: Core, data: GraphData, replaceAll: boolean) => {
      setGraphError(null);

      if (replaceAll) {
        cy.elements().remove();
      }

      const elements = graphToElements(data, expandedMethodsRef.current);
      if (elements.length === 0) {
        cy.resize();
        return;
      }

      const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
      const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
      const newElements: ElementDefinition[] = [];

      for (const el of elements) {
        const id = el.data.id as string;
        if (id.startsWith("edge:")) {
          if (!existingEdgeIds.has(id)) newElements.push(el);
        } else if (existingNodeIds.has(id)) {
          cy.getElementById(id).data(el.data);
        } else {
          newElements.push(el);
        }
      }

      if (newElements.length > 0) cy.add(newElements);

      cy.nodes('[type = "method"], [type = "function"]').forEach((n) => {
        n.ungrabify();
      });

      runGraphLayout(cy);
    }, []);

    useEffect(() => {
      expandedMethodsRef.current = new Set();
      setExpandedMethods(new Set());
    }, [graphResetKey]);

    useEffect(() => {
      expandedMethodsRef.current = expandedMethods;
      const cy = cyRef.current;
      if (!cy || !graphData) return;

      const replaceAll = graphResetKey !== prevGraphKeyRef.current;
      if (replaceAll) prevGraphKeyRef.current = graphResetKey;

      try {
        syncGraph(cy, graphData, replaceAll);
      } catch (err) {
        console.error(err);
        setGraphError(err instanceof Error ? err.message : "Graph render failed");
      }
    }, [expandedMethods, graphData, graphResetKey, syncGraph]);

    useEffect(() => {
      if (!containerRef.current) return;

      const theme = getGraphTheme();
      const cy = cytoscape({
        container: containerRef.current,
        style: buildCyStyles(theme),
        layout: { name: "grid" },
        minZoom: 0.2,
        maxZoom: 4,
        wheelSensitivity: 0.2,
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

      cy.on("mouseover", "node", (evt) => {
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
      });

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

    useEffect(() => {
      const cy = cyRef.current;
      if (!cy || !graphData) {
        if (cy && !graphData) cy.elements().remove();
        return;
      }
      if (cy.elements().length === 0) {
        try {
          syncGraph(cy, graphData, true);
        } catch (err) {
          console.error(err);
          setGraphError(err instanceof Error ? err.message : "Graph render failed");
        }
      }
    }, [graphData, syncGraph]);

    const handleBack = () => {
      const cy = cyRef.current;
      const snapshot = historyRef.current.pop();
      setCanGoBack(historyRef.current.length > 0);
      if (!cy || !snapshot) return;
      cy.json(snapshot);
      cy.resize();
      cy.fit(undefined, readFitPadding());
      setPathInfo(null);
      setPathFromId(null);
    };

    const visibleNodes =
      graphData?.nodes.filter((n) => n.type !== "file" && n.label?.trim()) ?? [];
    const isEmpty = visibleNodes.length === 0;

    return (
      <div ref={wrapperRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
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

        {graphError && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {graphError}
          </div>
        )}

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
            <p className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-lg text-muted-foreground">
              ← Click or drag a file to start
            </p>
          )}
        </div>

        {nodeTip && (
          <div
            className="pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 -translate-y-full rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{ left: nodeTip.x, top: nodeTip.y - 8 }}
          >
            <p className="font-medium">{nodeTip.label}</p>
            <p className="text-muted-foreground">{nodeTip.type}</p>
            <p className="truncate font-mono text-muted-foreground">{nodeTip.filePath}</p>
          </div>
        )}

        {contextMenu && (
          <div
            className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-md"
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

        <div className="absolute right-3 bottom-3 z-20">
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Fit to screen"
            aria-label="Fit to screen"
            onClick={() => {
              const cy = cyRef.current;
              if (cy && cy.elements().length > 0) cy.fit(undefined, readFitPadding());
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
