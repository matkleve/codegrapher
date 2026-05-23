import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { ChevronLeft, ChevronRight, Grid3x3, Maximize2 } from "lucide-react";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Button } from "@/components/ui/button";
import { setupViewportDrag } from "@/lib/cytoscapePan";
import { readFitPadding, runGraphLayout } from "@/lib/compoundLayout";
import {
  getGraphTheme,
  readTailwindMinSize,
  readTailwindSpacing,
  type GraphThemeColors,
} from "@/lib/cytoscapeTheme";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { graphToElements } from "@/lib/graphElements";
import {
  loadShowGrid,
  saveShowGrid,
  syncGridToViewport,
} from "@/lib/graphGrid";
import { cn } from "@/lib/utils";

const GRAPH_SUBTITLE =
  "Click a file to start a new graph, or drag a file onto the graph to add it.";
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
        width: readTailwindMinSize("min-w-40", "minWidth"),
        height: readTailwindMinSize("min-h-9", "minHeight"),
        "min-width": readTailwindMinSize("min-w-40", "minWidth"),
        "min-height": readTailwindMinSize("min-h-9", "minHeight"),
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
  function GraphCanvas({ graphData, graphResetKey, onFileDrop, loading }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const showGridRef = useRef(true);
    const historyBackRef = useRef<CySnapshot[]>([]);
    const historyForwardRef = useRef<CySnapshot[]>([]);
    const expandedMethodsRef = useRef<Set<string>>(new Set());
    const prevGraphKeyRef = useRef(-1);
    const lastSyncedFocusRef = useRef<string | null>(null);
    const graphDataRef = useRef<GraphData | null>(null);
    const graphResetKeyRef = useRef(0);
    const pathFromIdRef = useRef<string | null>(null);
    const viewportDragRef = useRef<ReturnType<typeof setupViewportDrag> | null>(null);
    const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [pathInfo, setPathInfo] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      nodeId: string;
    } | null>(null);
    const [pathFromId, setPathFromId] = useState<string | null>(null);
    const [nodeTip, setNodeTip] = useState<NodeTipState | null>(null);
    const [graphError, setGraphError] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(loadShowGrid);

    graphDataRef.current = graphData;
    showGridRef.current = showGrid;
    graphResetKeyRef.current = graphResetKey;
    pathFromIdRef.current = pathFromId;

    const updateHistoryButtons = useCallback(() => {
      setCanGoBack(historyBackRef.current.length > 0);
      setCanGoForward(historyForwardRef.current.length > 0);
    }, []);

    useImperativeHandle(ref, () => ({
      pushHistoryBeforeChange: () => {
        const cy = cyRef.current;
        if (!cy || cy.elements().length === 0) return;
        historyBackRef.current.push(cy.json());
        historyForwardRef.current = [];
        updateHistoryButtons();
      },
      getSnapshot: () => {
        const cy = cyRef.current;
        return cy && cy.elements().length > 0 ? cy.json() : null;
      },
    }), [updateHistoryButtons]);

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

      cy.nodes().ungrabify();
      cy.style(buildCyStyles(getGraphTheme()));

      cy.resize();
      requestAnimationFrame(() => runGraphLayout(cy));
    }, []);

    useEffect(() => {
      expandedMethodsRef.current = new Set();
      setExpandedMethods(new Set());
    }, [graphResetKey]);

    useEffect(() => {
      expandedMethodsRef.current = expandedMethods;
    }, [expandedMethods]);

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
        boxSelectionEnabled: false,
        userPanningEnabled: false,
      });

      const syncGrid = () => {
        const gridEl = gridRef.current;
        if (!gridEl || !showGridRef.current) return;
        syncGridToViewport(cy, gridEl);
      };

      viewportDragRef.current = setupViewportDrag(cy, syncGrid);

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
        const panDrag = viewportDragRef.current;
        if (panDrag?.isTapSuppressed()) {
          panDrag.clearTapSuppress();
          return;
        }

        const node = evt.target;
        const type = node.data("type");
        const fromId = pathFromIdRef.current;

        if (fromId) {
          const path = findShortestPath(cy, fromId, node.id());
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
          if (!pathFromIdRef.current) setPathInfo(null);
        }
      });

      cy.on("pan zoom resize", syncGrid);

      cyRef.current = cy;
      syncGrid();

      const pending = graphDataRef.current;
      if (pending) {
        prevGraphKeyRef.current = graphResetKeyRef.current;
        try {
          syncGraph(cy, pending, true);
        } catch (err) {
          console.error(err);
          setGraphError(err instanceof Error ? err.message : "Graph render failed");
        }
      }

      const wrapper = wrapperRef.current;
      const observer =
        wrapper &&
        new ResizeObserver(() => {
          cy.resize();
        });
      if (wrapper && observer) observer.observe(wrapper);

      return () => {
        observer?.disconnect();
        viewportDragRef.current?.destroy();
        viewportDragRef.current = null;
        cy.destroy();
        cyRef.current = null;
      };
    }, [findShortestPath, highlightPath, syncGraph]);

    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      if (!graphData) {
        cy.elements().remove();
        return;
      }

      const focusFile = graphData.focusFile ?? null;
      const replaceAll =
        graphResetKey !== prevGraphKeyRef.current ||
        focusFile !== lastSyncedFocusRef.current;

      if (replaceAll) {
        prevGraphKeyRef.current = graphResetKey;
        lastSyncedFocusRef.current = focusFile;
      }

      try {
        syncGraph(cy, graphData, replaceAll);
      } catch (err) {
        console.error(err);
        setGraphError(err instanceof Error ? err.message : "Graph render failed");
      }
    }, [expandedMethods, graphData, graphResetKey, syncGraph]);

    useEffect(() => {
      const cy = cyRef.current;
      const gridEl = gridRef.current;
      if (!cy || !gridEl || !showGrid) return;
      syncGridToViewport(cy, gridEl);
    }, [showGrid]);

    const toggleGrid = () => {
      setShowGrid((on) => {
        const next = !on;
        saveShowGrid(next);
        return next;
      });
    };

    const restoreSnapshot = (cy: Core, snapshot: CySnapshot) => {
      cy.json(snapshot);
      cy.resize();
      if (cy.nodes().length > 0) {
        cy.fit(undefined, readFitPadding());
      }
      setPathInfo(null);
      setPathFromId(null);
      requestAnimationFrame(() => {
        const gridEl = gridRef.current;
        if (gridEl && showGridRef.current) syncGridToViewport(cy, gridEl);
      });
    };

    const handleLastGraph = () => {
      const cy = cyRef.current;
      const snapshot = historyBackRef.current.pop();
      if (!cy || !snapshot) return;
      if (cy.elements().length > 0) {
        historyForwardRef.current.push(cy.json());
      }
      restoreSnapshot(cy, snapshot);
      updateHistoryButtons();
    };

    const handleNextGraph = () => {
      const cy = cyRef.current;
      const snapshot = historyForwardRef.current.pop();
      if (!cy || !snapshot) return;
      if (cy.elements().length > 0) {
        historyBackRef.current.push(cy.json());
      }
      restoreSnapshot(cy, snapshot);
      updateHistoryButtons();
    };

    const visibleNodes =
      graphData?.nodes.filter((n) => n.type !== "file" && n.label?.trim()) ?? [];
    const hasGraph = visibleNodes.length > 0;
    const emptyMessage = graphData?.focusFile
      ? "No classes or functions found in this file"
      : "Click or drag a file to start";

    return (
      <div
        ref={wrapperRef}
        className="pointer-events-auto relative flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="pointer-events-auto relative z-30 flex items-center gap-3 border-b border-border bg-card px-3 py-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Graph</h2>
            <p className="text-xs text-muted-foreground">{GRAPH_SUBTITLE}</p>
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoBack}
              onClick={handleLastGraph}
              title="Last graph"
              aria-label="Last graph"
            >
              <ChevronLeft data-icon="inline-start" />
              Last graph
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoForward}
              onClick={handleNextGraph}
              title="Next graph"
              aria-label="Next graph"
            >
              Next graph
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
          {loading && (
            <span className="shrink-0 text-sm text-muted-foreground">Loading…</span>
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
          <p className="pointer-events-none absolute top-14 right-3 z-20 text-xs text-muted-foreground">
            Click target node…
          </p>
        )}

        <div
          className="relative min-h-0 flex-1 bg-background"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const filePath =
              e.dataTransfer.getData(DRAG_FILEPATH_KEY) ||
              e.dataTransfer.getData("text/plain");
            if (filePath) onFileDrop(filePath);
          }}
        >
          <div
            ref={gridRef}
            aria-hidden
            className={cn(
              "graph-canvas-grid pointer-events-none absolute inset-0 z-0",
              !showGrid && "hidden",
            )}
          />
          <div ref={containerRef} className="absolute inset-0 z-10" />
          {!hasGraph && !loading && (
            <p className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6 text-center text-lg text-muted-foreground">
              {emptyMessage}
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
            className="pointer-events-auto fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-md"
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

        <div className="pointer-events-auto absolute right-3 bottom-3 z-30 flex flex-col gap-2">
          <Button
            type="button"
            variant={showGrid ? "default" : "outline"}
            size="icon"
            title={showGrid ? "Hide grid" : "Show grid"}
            aria-label={showGrid ? "Hide grid" : "Show grid"}
            aria-pressed={showGrid}
            onClick={toggleGrid}
          >
            <Grid3x3 />
          </Button>
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
