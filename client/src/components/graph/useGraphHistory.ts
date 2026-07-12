import { useCallback, useRef, useState } from "react";
import { useReactFlow, type Edge, type Node } from "@xyflow/react";
import type { FlowSnapshot } from "@/components/nodes/flowNodeTypes";
import type { GraphCanvasHandle } from "@/components/graph/graphCanvasTypes";
import { FIT_VIEW_PADDING } from "@/lib/flowLayout";
import { cloneFlowSnapshot } from "@/lib/graphFlowSnapshot";

type UseGraphHistoryOptions = {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  canvasRef: React.Ref<GraphCanvasHandle>;
  syncGrid: () => void;
  onRestoreSnapshot?: () => void;
};

export function useGraphHistory({
  nodes,
  edges,
  setNodes,
  setEdges,
  canvasRef,
  syncGrid,
  onRestoreSnapshot,
}: UseGraphHistoryOptions) {
  const historyBackRef = useRef<FlowSnapshot[]>([]);
  const historyForwardRef = useRef<FlowSnapshot[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const { fitView, setViewport, getViewport } = useReactFlow();

  const updateHistoryButtons = useCallback(() => {
    setCanGoBack(historyBackRef.current.length > 0);
    setCanGoForward(historyForwardRef.current.length > 0);
  }, []);

  const restoreSnapshot = useCallback(
    (snapshot: FlowSnapshot) => {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setViewport(snapshot.viewport);
      onRestoreSnapshot?.();
      requestAnimationFrame(() => {
        if (snapshot.nodes.length > 0) {
          fitView({ padding: FIT_VIEW_PADDING, duration: 200 });
        }
        syncGrid();
      });
    },
    [fitView, onRestoreSnapshot, setEdges, setNodes, setViewport, syncGrid],
  );

  const handleLastGraph = useCallback(() => {
    const snapshot = historyBackRef.current.pop();
    if (!snapshot) return;
    if (nodes.length > 0) {
      historyForwardRef.current.push(cloneFlowSnapshot(nodes, edges, getViewport()));
    }
    restoreSnapshot(snapshot);
    updateHistoryButtons();
  }, [edges, getViewport, nodes, restoreSnapshot, updateHistoryButtons]);

  const handleNextGraph = useCallback(() => {
    const snapshot = historyForwardRef.current.pop();
    if (!snapshot) return;
    if (nodes.length > 0) {
      historyBackRef.current.push(cloneFlowSnapshot(nodes, edges, getViewport()));
    }
    restoreSnapshot(snapshot);
    updateHistoryButtons();
  }, [edges, getViewport, nodes, restoreSnapshot, updateHistoryButtons]);

  const pushHistoryBeforeChange = useCallback(() => {
    if (nodes.length === 0) return;
    historyBackRef.current.push(cloneFlowSnapshot(nodes, edges, getViewport()));
    historyForwardRef.current = [];
    updateHistoryButtons();
  }, [edges, getViewport, nodes, updateHistoryButtons]);

  const getSnapshot = useCallback(
    () => (nodes.length > 0 ? cloneFlowSnapshot(nodes, edges, getViewport()) : null),
    [edges, getViewport, nodes],
  );

  return {
    canGoBack,
    canGoForward,
    handleLastGraph,
    handleNextGraph,
    pushHistoryBeforeChange,
    getSnapshot,
    updateHistoryButtons,
  };
}
