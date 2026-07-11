import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type OnMove,
} from "@xyflow/react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileText,
  Grid3x3,
  Maximize2,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { INTERACTIVE_TOGGLE_ACTIVE } from "@/lib/controlTokens";
import { GraphFlowCanvas } from "@/components/graph/GraphFlowCanvas";
import { GraphPane } from "@/components/graph/GraphPane";
import { GraphMapControlButton } from "@/components/graph/GraphMapControlButton";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import type { FlowSnapshot } from "@/components/nodes/flowNodeTypes";
import type {
  GraphCanvasHandle,
  GraphCanvasProps,
} from "@/components/graph/graphCanvasTypes";
import { GraphInteractionProvider } from "@/context/GraphInteractionContext";
import { SimulationProvider } from "@/context/SimulationContext";
import { SimulationPanel, SimulationPreflight } from "@/components/simulation/SimulationPanel";
import { SimulationToolbar } from "@/components/simulation/SimulationToolbar";
import { SimulationPanelToggle } from "@/components/simulation/SimulationPanelToggle";
import { JumpTooltipProvider } from "@/context/JumpTooltipContext";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { FIT_VIEW_PADDING, layoutFlowElements } from "@/lib/flowLayout";
import { cloneFlowSnapshot } from "@/lib/graphFlowSnapshot";
import {
  applyPathHighlight,
  clearPathHighlight,
  findShortestPath,
} from "@/lib/graphPathHighlight";
import {
  collectFlowNodeUiState,
  graphToFlow,
  appendFlowElements,
} from "@/lib/graphToFlow";
import {
  loadShowGrid,
  saveShowGrid,
  syncGridToViewport,
} from "@/lib/graphGrid";
import {
  applyReadingFocusToNodes,
  clearReadingFocusFromNodes,
  clearFocusFromUrl,
  computeReadingWidth,
  findFocusTargetElement,
  normalizeReadingFocus,
  parseFocusFromUrl,
  scrollToReadingPosition,
  writeFocusToUrl,
  type ReadingFocus,
} from "@/lib/graphReadingFocus";
import { clearElementRegistry } from "@/lib/elementRegistry";
import { cn } from "@/lib/utils";
import type { GraphData } from "@/types";

const GRAPH_SUBTITLE =
  "Click a file to start a new graph, or drag a file onto the graph to add it.";

interface GraphFlowInnerProps extends GraphCanvasProps {
  canvasRef: React.Ref<GraphCanvasHandle>;
}

export function GraphFlowInner({
  graphData,
  graphResetKey,
  onFileDrop,
  onLoadFile,
  loading,
  canvasRef,
}: GraphFlowInnerProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const graphPaneRef = useRef<HTMLDivElement>(null);
  const urlFocusAppliedRef = useRef(false);
  const historyBackRef = useRef<FlowSnapshot[]>([]);
  const historyForwardRef = useRef<FlowSnapshot[]>([]);
  const prevGraphKeyRef = useRef(-1);
  const pathFromIdRef = useRef<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pathInfo, setPathInfo] = useState<string | null>(null);
  const [pathFromId, setPathFromId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(loadShowGrid);
  const [mapControlFlash, setMapControlFlash] = useState<string | null>(null);
  const [readingFocus, setReadingFocus] = useState<ReadingFocus | null>(null);
  const mapControlFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashMapControl = useCallback((key: string) => {
    if (mapControlFlashTimerRef.current) {
      clearTimeout(mapControlFlashTimerRef.current);
    }
    setMapControlFlash(key);
    mapControlFlashTimerRef.current = setTimeout(() => {
      setMapControlFlash(null);
      mapControlFlashTimerRef.current = null;
    }, 450);
  }, []);

  useEffect(
    () => () => {
      if (mapControlFlashTimerRef.current) {
        clearTimeout(mapControlFlashTimerRef.current);
      }
    },
    [],
  );

  const { fitView, setViewport, getViewport, setCenter, screenToFlowPosition } =
    useReactFlow();

  pathFromIdRef.current = pathFromId;

  const syncGrid = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl || !showGrid) return;
    syncGridToViewport(getViewport(), gridEl);
  }, [getViewport, showGrid]);

  const updateHistoryButtons = useCallback(() => {
    setCanGoBack(historyBackRef.current.length > 0);
    setCanGoForward(historyForwardRef.current.length > 0);
  }, []);

  const dropLockRef = useRef(false);

  const applyLayoutAndFit = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], fit = true, preservePositions = false) => {
      const prevPos = preservePositions
        ? new Map(nodesRef.current.map((n) => [n.id, n.position]))
        : null;
      const laidOut = layoutFlowElements(nextNodes, nextEdges);
      const positioned = prevPos
        ? laidOut.map((n) =>
            prevPos.has(n.id) ? { ...n, position: prevPos.get(n.id)! } : n,
          )
        : laidOut;
      setNodes(positioned);
      setEdges(nextEdges);
      if (fit && positioned.length > 0) {
        requestAnimationFrame(() => {
          fitView({ padding: FIT_VIEW_PADDING, duration: 200 });
          syncGrid();
        });
      }
    },
    [fitView, setEdges, setNodes, syncGrid],
  );

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const syncFromGraphData = useCallback(
    (data: GraphData, replaceAll: boolean) => {
      setGraphError(null);
      const ui = collectFlowNodeUiState(nodesRef.current);
      const { nodes: freshNodes, edges: freshEdges } = graphToFlow(data, ui);

      if (freshNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      if (replaceAll) {
        applyLayoutAndFit(freshNodes, freshEdges);
        return;
      }

      const existingIds = new Set(nodesRef.current.map((n) => n.id));
      const appended = appendFlowElements(nodesRef.current, edgesRef.current, {
        nodes: freshNodes,
        edges: freshEdges,
      });
      const mergedNodes = appended.nodes.map((n) =>
        existingIds.has(n.id)
          ? n
          : { ...n, className: cn(n.className, "node-fade-in") },
      );
      const addedNodes = mergedNodes.filter((n) => !existingIds.has(n.id));
      applyLayoutAndFit(mergedNodes, appended.edges, false, true);
      if (addedNodes.length > 0) {
        const target = addedNodes[0]!;
        const w =
          typeof target.width === "number" ? target.width : CLASS_NODE_DEFAULT_WIDTH;
        const h = typeof target.height === "number" ? target.height : 120;
        requestAnimationFrame(() => {
          void setCenter(target.position.x + w / 2, target.position.y + h / 2, {
            zoom: 1.15,
            duration: 350,
          });
        });
      }
    },
    [applyLayoutAndFit, setCenter, setEdges, setNodes],
  );

  useImperativeHandle(
    canvasRef,
    () => ({
      pushHistoryBeforeChange: () => {
        if (nodes.length === 0) return;
        historyBackRef.current.push(cloneFlowSnapshot(nodes, edges, getViewport()));
        historyForwardRef.current = [];
        updateHistoryButtons();
      },
      getSnapshot: () =>
        nodes.length > 0 ? cloneFlowSnapshot(nodes, edges, getViewport()) : null,
    }),
    [nodes, edges, getViewport, updateHistoryButtons],
  );

  useEffect(() => {
    if (!graphData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // graphResetKey is the sole "replace" signal (bumped only by the tree-click
    // replace action in App.tsx) — merges (drag / "load into graph") must never
    // match here, or every incremental load wrongly re-runs a full dagre layout
    // + generic fitView instead of appending and centering on the new node.
    const replaceAll = graphResetKey !== prevGraphKeyRef.current;

    if (replaceAll) {
      prevGraphKeyRef.current = graphResetKey;
    }

    try {
      syncFromGraphData(graphData, replaceAll);
    } catch (err) {
      console.error(err);
      setGraphError(err instanceof Error ? err.message : "Graph render failed");
    }
  }, [graphData, graphResetKey, syncFromGraphData, setEdges, setNodes]);

  const onMove: OnMove = useCallback(() => {
    syncGrid();
  }, [syncGrid]);

  useEffect(() => {
    syncGrid();
  }, [showGrid, syncGrid]);

  const toggleGrid = () => {
    setShowGrid((on) => {
      const next = !on;
      saveShowGrid(next);
      return next;
    });
  };

  const runReadingFocusLayout = useCallback(
    (focus: ReadingFocus) => {
      const pane = graphPaneRef.current;
      if (!pane) return;

      setNodes((nds) => applyReadingFocusToNodes(nds, focus));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const cardEl = document.querySelector(
            `[data-flow-node-id="${CSS.escape(focus.flowNodeId)}"]`,
          );
          if (!(cardEl instanceof HTMLElement)) return;

          const targetWidth = computeReadingWidth(pane, cardEl, getViewport);
          setNodes((nds) =>
            applyReadingFocusToNodes(nds, focus, { width: targetWidth }),
          );

          requestAnimationFrame(() => {
            const targetEl = findFocusTargetElement(focus);
            if (!targetEl) return;
            scrollToReadingPosition({
              paneEl: pane,
              targetEl,
              getViewport,
              setViewport,
              screenToFlowPosition,
            });
            syncGrid();
          });
        });
      });
    },
    [getViewport, screenToFlowPosition, setNodes, setViewport, syncGrid],
  );

  const focusReadingMember = useCallback(
    (flowNodeId: string, memberId: string) => {
      const focus: ReadingFocus = { flowNodeId, memberId };
      setReadingFocus(focus);
      runReadingFocusLayout(focus);
    },
    [runReadingFocusLayout],
  );

  const focusReadingView = useCallback(() => {
    if (!readingFocus) return;
    runReadingFocusLayout(readingFocus);
  }, [readingFocus, runReadingFocusLayout]);

  const centerView = () => {
    if (nodes.length > 0) {
      const vp = getViewport();
      const bounds = nodes.reduce(
        (acc, n) => {
          const w =
            typeof n.width === "number" ? n.width : CLASS_NODE_DEFAULT_WIDTH;
          const h = typeof n.height === "number" ? n.height : 120;
          const x1 = n.position.x;
          const y1 = n.position.y;
          const x2 = n.position.x + w;
          const y2 = n.position.y + h;
          return {
            minX: Math.min(acc.minX, x1),
            minY: Math.min(acc.minY, y1),
            maxX: Math.max(acc.maxX, x2),
            maxY: Math.max(acc.maxY, y2),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      setCenter(cx, cy, { zoom: vp.zoom, duration: 200 });
    } else {
      setViewport({ x: 0, y: 0, zoom: 1 });
    }
    syncGrid();
  };

  const restoreSnapshot = (snapshot: FlowSnapshot) => {
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setViewport(snapshot.viewport);
    setPathInfo(null);
    setPathFromId(null);
    requestAnimationFrame(() => {
      if (snapshot.nodes.length > 0) {
        fitView({ padding: FIT_VIEW_PADDING, duration: 200 });
      }
      syncGrid();
    });
  };

  const handleLastGraph = () => {
    const snapshot = historyBackRef.current.pop();
    if (!snapshot) return;
    if (nodes.length > 0) {
      historyForwardRef.current.push(cloneFlowSnapshot(nodes, edges, getViewport()));
    }
    restoreSnapshot(snapshot);
    updateHistoryButtons();
  };

  const handleNextGraph = () => {
    const snapshot = historyForwardRef.current.pop();
    if (!snapshot) return;
    if (nodes.length > 0) {
      historyBackRef.current.push(cloneFlowSnapshot(nodes, edges, getViewport()));
    }
    restoreSnapshot(snapshot);
    updateHistoryButtons();
  };

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const fromId = pathFromIdRef.current;
      if (fromId) {
        const path = findShortestPath(edges, fromId, node.id);
        setPathFromId(null);
        if (path) {
          const highlighted = applyPathHighlight(nodes, edges, path.nodeIds, path.edgeIds);
          setNodes(highlighted.nodes);
          setEdges(highlighted.edges);
          const labels = path.nodeIds.map((id) => {
            const n = nodes.find((x) => x.id === id);
            if (!n) return id;
            return (n.data as ClassNodeData).label ?? id;
          });
          setPathInfo(`Path: ${labels.join(" → ")}`);
        } else {
          setPathInfo("No path found between nodes");
        }
        return;
      }

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id,
          data: {
            ...n.data,
            selected: n.id === node.id,
          },
        })),
      );
      setContextMenu(null);
    },
    [edges, nodes, setEdges, setNodes],
  );

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    if (!pathFromIdRef.current) setPathInfo(null);
  }, []);

  const hasReadingFocus = readingFocus != null;

  useEffect(() => {
    if (!readingFocus) {
      clearFocusFromUrl();
      setNodes((nds) => clearReadingFocusFromNodes(nds));
      return;
    }
    writeFocusToUrl(readingFocus);
  }, [readingFocus, setNodes]);

  useEffect(() => {
    if (!readingFocus) return;
    const normalized = normalizeReadingFocus(nodes, readingFocus);
    if (
      normalized.flowNodeId !== readingFocus.flowNodeId ||
      normalized.memberId !== readingFocus.memberId
    ) {
      setReadingFocus(normalized);
    }
  }, [nodes, readingFocus]);

  useEffect(() => {
    urlFocusAppliedRef.current = false;
    setReadingFocus(null);
    clearElementRegistry();
  }, [graphResetKey]);

  useEffect(() => {
    if (nodes.length === 0 || urlFocusAppliedRef.current) return;
    const urlFocus = parseFocusFromUrl();
    if (!urlFocus) return;
    if (!nodes.some((n) => n.id === urlFocus.flowNodeId)) return;

    urlFocusAppliedRef.current = true;
    setReadingFocus(urlFocus);
    runReadingFocusLayout(urlFocus);
  }, [nodes, runReadingFocusLayout]);

  const visibleNodes =
    graphData?.nodes.filter((n) => n.type !== "file" && n.label?.trim()) ?? [];
  const hasGraph = nodes.length > 0 || visibleNodes.length > 0;
  const emptyTitle = graphData?.focusFile
    ? "Nothing to graph here"
    : "Start exploring";
  const emptyHint = graphData?.focusFile
    ? "No classes or functions found in this file."
    : "Click a file in the explorer, or drag one onto the canvas.";

  return (
    <div className="pointer-events-auto relative flex min-h-0 min-w-0 flex-1 flex-col">
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

      <JumpTooltipProvider>
        <GraphInteractionProvider
          graphData={graphData}
          nodes={nodes}
          setNodes={setNodes}
          onLoadFile={onLoadFile}
          onFocusReadingMember={focusReadingMember}
        >
          <SimulationProvider>
            <div className="pointer-events-auto relative z-30 flex items-center gap-3 border-b border-border bg-card px-3 py-2">
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]"
                  />
                  Graph
                </h2>
                <p className="text-xs text-muted-foreground">{GRAPH_SUBTITLE}</p>
              </div>
              <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
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
                  variant="ghost"
                  size="sm"
                  disabled={!canGoForward}
                  onClick={handleNextGraph}
                  title="Next graph"
                  aria-label="Next graph"
                >
                  Next graph
                  <ChevronRight data-icon="inline-end" />
                </Button>
                <SimulationPanelToggle />
              </div>
              {loading && (
                <span className="shrink-0 text-sm text-muted-foreground">Loading…</span>
              )}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1">
              <GraphPane
            ref={graphPaneRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dropLockRef.current || loading) return;
              const filePath =
                e.dataTransfer.getData(DRAG_FILEPATH_KEY) ||
                e.dataTransfer.getData("text/plain");
              if (!filePath.trim()) return;
              dropLockRef.current = true;
              try {
                await Promise.resolve(onFileDrop(filePath));
              } finally {
                dropLockRef.current = false;
              }
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
            <GraphFlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={onPaneClick}
              onMove={onMove}
            />
            {!hasGraph && !loading && (
              <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="grid size-14 place-items-center rounded-2xl border border-border bg-card/70 text-muted-foreground shadow-[var(--node-shadow)] backdrop-blur-sm">
                  <Waypoints className="size-6" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-base font-medium text-foreground">{emptyTitle}</p>
                  <p className="max-w-xs text-sm text-muted-foreground">{emptyHint}</p>
                </div>
              </div>
            )}
          </GraphPane>
              <SimulationPanel />
            </div>
            <SimulationToolbar />
            <SimulationPreflight />
          </SimulationProvider>
        </GraphInteractionProvider>
      </JumpTooltipProvider>

      {contextMenu && (
        <div
          className="pointer-events-auto fixed z-50 min-w-40 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Container className="p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setPathFromId(contextMenu.nodeId);
                setContextMenu(null);
                setPathInfo(null);
                const cleared = clearPathHighlight(nodes, edges);
                setNodes(cleared.nodes);
                setEdges(cleared.edges);
              }}
            >
              Find path to…
            </Button>
          </Container>
        </div>
      )}

      <div
        data-graph-control
        className="pointer-events-auto absolute right-3 bottom-3 z-30 flex flex-col gap-2"
      >
        <GraphMapControlButton
          flashKey="grid"
          activeFlashKey={mapControlFlash}
          onFlash={flashMapControl}
          variant="secondary"
          className={showGrid ? INTERACTIVE_TOGGLE_ACTIVE : undefined}
          title={showGrid ? "Hide grid" : "Show grid"}
          aria-label={showGrid ? "Hide grid" : "Show grid"}
          aria-pressed={showGrid}
          onClick={toggleGrid}
        >
          <Grid3x3 />
        </GraphMapControlButton>
        <GraphMapControlButton
          flashKey="reading"
          activeFlashKey={mapControlFlash}
          onFlash={flashMapControl}
          variant="secondary"
          disabled={!hasReadingFocus}
          title="Focus selection for reading"
          aria-label="Focus selection for reading"
          onClick={focusReadingView}
        >
          <FileText />
        </GraphMapControlButton>
        <GraphMapControlButton
          flashKey="center"
          activeFlashKey={mapControlFlash}
          onFlash={flashMapControl}
          variant="secondary"
          title="Center view"
          aria-label="Center view"
          onClick={centerView}
        >
          <Crosshair />
        </GraphMapControlButton>
        <GraphMapControlButton
          flashKey="fit"
          activeFlashKey={mapControlFlash}
          onFlash={flashMapControl}
          variant="secondary"
          title="Fit to screen"
          aria-label="Fit to screen"
          onClick={() => {
            if (nodes.length > 0) {
              fitView({ padding: FIT_VIEW_PADDING, duration: 200 });
              syncGrid();
            }
          }}
        >
          <Maximize2 />
        </GraphMapControlButton>
      </div>
    </div>
  );
}
