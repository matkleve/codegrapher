import {
  ReactFlow,
  type Edge,
  type Node,
  type OnMove,
  type useEdgesState,
  type useNodesState,
} from "@xyflow/react";
import { TokenContextBar } from "@/components/code/TokenContextBar";
import { GraphPinchZoomBoost } from "@/components/graph/GraphPinchZoomBoost";
import { JumpTooltip } from "@/components/graph/JumpTooltip";
import { PreviewEdgeOverlay } from "@/components/graph/PreviewEdgeOverlay";
import { flowNodeTypes } from "@/components/nodes/flowNodeTypes";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

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

export function GraphFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeContextMenu,
  onPaneClick,
  onMove,
}: GraphFlowCanvasProps) {
  const { clearTokenInfo, isCtrlPreviewMode, isTraceActive, isWarm, pinnedTokenKey } =
    useGraphInteraction();

  const handlePaneClick = useCallback(() => {
    clearTokenInfo();
    onPaneClick();
  }, [clearTokenInfo, onPaneClick]);

  return (
    <div
      className={cn(
        "relative h-full w-full",
        isCtrlPreviewMode && "graph-ctrl-preview",
        isTraceActive && "graph-trace-active",
        isTraceActive && isWarm && "graph-trace-warm",
        pinnedTokenKey != null && "graph-trace-pinned",
      )}
    >
      <ReactFlow
        className="graph-flow-container"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={flowNodeTypes}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={handlePaneClick}
        onMove={onMove}
        onMoveEnd={onMove}
        minZoom={0.2}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodeDragThreshold={4}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        panOnScrollMode="free"
        zoomOnScroll
        zoomOnPinch
        panOnDrag
      >
        <PreviewEdgeOverlay />
      </ReactFlow>
      <GraphPinchZoomBoost />
      <TokenContextBar />
      <JumpTooltip />
    </div>
  );
}
