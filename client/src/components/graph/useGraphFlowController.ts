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
} from "@xyflow/react";
import type {
  GraphCanvasHandle,
  GraphCanvasProps,
} from "@/components/graph/graphCanvasTypes";
import { useGraphHistory } from "@/components/graph/useGraphHistory";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { FIT_VIEW_PADDING, layoutFlowElements } from "@/lib/flowLayout";
import {
  appendFlowElements,
  collectFlowNodeUiState,
  graphToFlow,
} from "@/lib/graphToFlow";
import { cn } from "@/lib/utils";
import type { GraphData } from "@/types";

type UseGraphFlowControllerOptions = Pick<
  GraphCanvasProps,
  "graphData" | "graphResetKey" | "onFileDrop" | "loading"
> & {
  canvasRef: React.Ref<GraphCanvasHandle>;
  syncGrid: () => void;
  onRestoreSnapshot?: () => void;
};

export function useGraphFlowController({
  graphData,
  graphResetKey,
  onFileDrop,
  loading,
  canvasRef,
  syncGrid,
  onRestoreSnapshot,
}: UseGraphFlowControllerOptions) {
  const graphPaneRef = useRef<HTMLDivElement>(null);
  const prevGraphKeyRef = useRef(-1);
  const dropLockRef = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [graphError, setGraphError] = useState<string | null>(null);

  const { fitView, setCenter } = useReactFlow();

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const history = useGraphHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
    canvasRef,
    syncGrid,
    onRestoreSnapshot,
  });

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
        requestAnimationFrame(() => {
          void setCenter(target.position.x + w / 2, target.position.y + (typeof target.height === "number" ? target.height : 120) / 2, {
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
      pushHistoryBeforeChange: history.pushHistoryBeforeChange,
      getSnapshot: history.getSnapshot,
    }),
    [history.getSnapshot, history.pushHistoryBeforeChange],
  );

  useEffect(() => {
    if (!graphData) {
      setNodes([]);
      setEdges([]);
      return;
    }

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
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
    },
    [loading, onFileDrop],
  );

  const visibleNodes =
    graphData?.nodes.filter((n) => n.type !== "file" && n.label?.trim()) ?? [];
  const hasGraph = nodes.length > 0 || visibleNodes.length > 0;
  const emptyTitle = graphData?.focusFile
    ? "Nothing to graph here"
    : "Start exploring";
  const emptyHint = graphData?.focusFile
    ? "No classes or functions found in this file."
    : "Click a file in the explorer, or drag one onto the canvas.";

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    graphPaneRef,
    graphError,
    hasGraph,
    emptyTitle,
    emptyHint,
    canGoBack: history.canGoBack,
    canGoForward: history.canGoForward,
    handleLastGraph: history.handleLastGraph,
    handleNextGraph: history.handleNextGraph,
    handleDragOver,
    handleDrop,
  };
}
