import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type OnMove,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronLeft, ChevronRight, Crosshair, Grid3x3, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenReferencesDropdown } from "@/components/code/TokenReferencesDropdown";
import { Container } from "@/components/ui/Container";
import { flowNodeTypes, type FlowSnapshot } from "@/components/nodes/flowNodeTypes";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import {
  buildPreviewFlowEdge,
  GraphInteractionProvider,
  PREVIEW_EDGE_ID,
  useGraphInteraction,
} from "@/context/GraphInteractionContext";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { FIT_VIEW_PADDING, layoutFlowElements } from "@/lib/flowLayout";
import {
  collectFlowNodeUiState,
  graphToFlow,
  mergeFlowElements,
} from "@/lib/graphToFlow";
import {
  loadShowGrid,
  saveShowGrid,
  syncGridToViewport,
} from "@/lib/graphGrid";
import { cn } from "@/lib/utils";
import type { GraphData } from "../types";

const GRAPH_SUBTITLE =
  "Click a file to start a new graph, or drag a file onto the graph to add it.";

export interface GraphCanvasHandle {
  pushHistoryBeforeChange: () => void;
  getSnapshot: () => FlowSnapshot | null;
}

interface GraphCanvasProps {
  graphData: GraphData | null;
  graphResetKey: number;
  onFileDrop: (filePath: string) => void;
  loading?: boolean;
}

function cloneSnapshot(
  nodes: Node[],
  edges: Edge[],
  viewport: { x: number; y: number; zoom: number },
): FlowSnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    viewport: { ...viewport },
  };
}

function findShortestPath(
  edges: Edge[],
  fromId: string,
  toId: string,
): { nodeIds: string[]; edgeIds: string[] } | null {
  if (fromId === toId) return { nodeIds: [fromId], edgeIds: [] };

  const adj = new Map<string, { neighbor: string; edgeId: string }[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push({ neighbor: edge.target, edgeId: edge.id });
    adj.get(edge.target)!.push({ neighbor: edge.source, edgeId: edge.id });
  }

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
}

function applyPathHighlight(
  nodes: Node[],
  edges: Edge[],
  nodeIds: string[],
  edgeIds: string[],
): { nodes: Node[]; edges: Edge[] } {
  const nodeSet = new Set(nodeIds);
  const edgeSet = new Set(edgeIds);
  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        pathHighlighted: nodeSet.has(n.id),
      },
    })),
    edges: edges.map((e) => ({
      ...e,
      className: edgeSet.has(e.id) ? "path-highlight" : undefined,
      animated: edgeSet.has(e.id) ? true : e.animated,
      style: edgeSet.has(e.id)
        ? { ...e.style, stroke: "var(--ring)", strokeWidth: 3 }
        : e.style,
    })),
  };
}

function clearPathHighlight(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: { ...n.data, pathHighlighted: false, selected: false },
    })),
    edges: edges.map((e) => ({
      ...e,
      className: undefined,
      style:
        e.data?.edgeType === "imports"
          ? { stroke: "var(--primary)" }
          : { stroke: "var(--muted-foreground)" },
      animated: e.data?.edgeType === "imports",
    })),
  };
}

type GraphFlowCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState<Node>>[2];
  onEdgesChange: ReturnType<typeof useEdgesState<Edge>>[2];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  onMove: OnMove;
};

function GraphFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeContextMenu,
  onPaneClick,
  onMove,
}: GraphFlowCanvasProps) {
  const { previewEdge } = useGraphInteraction();

  const displayEdges = useMemo(() => {
    const withoutPreview = edges.filter((e) => e.id !== PREVIEW_EDGE_ID);
    const preview = buildPreviewFlowEdge(previewEdge);
    return preview ? [...withoutPreview, preview] : withoutPreview;
  }, [edges, previewEdge]);

  return (
    <>
      <ReactFlow
        className="graph-flow-container"
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={flowNodeTypes}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onMove={onMove}
        onMoveEnd={onMove}
        minZoom={0.2}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodeDragThreshold={4}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll={false}
        zoomOnScroll
        panOnDrag
      />
      <TokenReferencesDropdown />
    </>
  );
}

interface GraphFlowInnerProps extends GraphCanvasProps {
  canvasRef: React.Ref<GraphCanvasHandle>;
}

function GraphFlowInner({
  graphData,
  graphResetKey,
  onFileDrop,
  loading,
  canvasRef,
}: GraphFlowInnerProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const historyBackRef = useRef<FlowSnapshot[]>([]);
  const historyForwardRef = useRef<FlowSnapshot[]>([]);
  const prevGraphKeyRef = useRef(-1);
  const lastSyncedFocusRef = useRef<string | null>(null);
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

  const { fitView, setViewport, getViewport, setCenter } = useReactFlow();

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

      const merged = mergeFlowElements(nodesRef.current, edgesRef.current, {
        nodes: freshNodes,
        edges: freshEdges,
      });
      applyLayoutAndFit(merged.nodes, merged.edges, false, true);
    },
    [applyLayoutAndFit, setEdges, setNodes],
  );

  useImperativeHandle(
    canvasRef,
    () => ({
      pushHistoryBeforeChange: () => {
        if (nodes.length === 0) return;
        historyBackRef.current.push(cloneSnapshot(nodes, edges, getViewport()));
        historyForwardRef.current = [];
        updateHistoryButtons();
      },
      getSnapshot: () =>
        nodes.length > 0 ? cloneSnapshot(nodes, edges, getViewport()) : null,
    }),
    [nodes, edges, getViewport, updateHistoryButtons],
  );

  useEffect(() => {
    if (!graphData) {
      setNodes([]);
      setEdges([]);
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
      syncFromGraphData(graphData, replaceAll);
    } catch (err) {
      console.error(err);
      setGraphError(err instanceof Error ? err.message : "Graph render failed");
    }
  }, [graphData, graphResetKey, syncFromGraphData]);

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

  const centerView = () => {
    if (nodes.length > 0) {
      const vp = getViewport();
      const bounds = nodes.reduce(
        (acc, n) => {
          const w = 280;
          const h = 120;
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
      historyForwardRef.current.push(cloneSnapshot(nodes, edges, getViewport()));
    }
    restoreSnapshot(snapshot);
    updateHistoryButtons();
  };

  const handleNextGraph = () => {
    const snapshot = historyForwardRef.current.pop();
    if (!snapshot) return;
    if (nodes.length > 0) {
      historyBackRef.current.push(cloneSnapshot(nodes, edges, getViewport()));
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

  const visibleNodes =
    graphData?.nodes.filter((n) => n.type !== "file" && n.label?.trim()) ?? [];
  const hasGraph = nodes.length > 0 || visibleNodes.length > 0;
  const emptyMessage = graphData?.focusFile
    ? "No classes or functions found in this file"
    : "Click or drag a file to start";

  return (
    <div className="pointer-events-auto relative flex min-h-0 min-w-0 flex-1 flex-col">
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
        className="graph-pane relative min-h-0 flex-1 bg-background"
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
        <GraphInteractionProvider
          graphData={graphData}
          nodes={nodes}
          setNodes={setNodes}
          onLoadFile={onFileDrop}
        >
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
        </GraphInteractionProvider>
        {!hasGraph && !loading && (
          <p className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6 text-center text-lg text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>

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
          title="Center view"
          aria-label="Center view"
          onClick={centerView}
        >
          <Crosshair />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
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
        </Button>
      </div>
    </div>
  );
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <GraphFlowInner {...props} canvasRef={ref} />
      </ReactFlowProvider>
    );
  },
);

export default GraphCanvas;
