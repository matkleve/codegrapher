import {
  ReactFlow,
  type Edge,
  type Node,
  type OnMove,
  type useEdgesState,
  type useNodesState,
} from "@xyflow/react";
import { TokenContextBar } from "@/components/code/TokenContextBar";
import { TokenConnectionMenu } from "@/components/code/TokenConnectionMenu";
import { GraphPinchZoomBoost } from "@/components/graph/GraphPinchZoomBoost";
import { JumpTooltip } from "@/components/graph/JumpTooltip";
import { PreviewEdgeOverlay } from "@/components/graph/PreviewEdgeOverlay";
import { ConnectionLegend } from "@/components/graph/ConnectionLegend";
import { flowNodeTypes } from "@/components/nodes/flowNodeTypes";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { notifyWireTransform } from "@/lib/wireEngine";
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
  const { clearTokenInfo, clearConnectionMenu } = useGraphInteraction();

  const handlePaneClick = useCallback(() => {
    clearTokenInfo();
    clearConnectionMenu();
    onPaneClick();
  }, [clearConnectionMenu, clearTokenInfo, onPaneClick]);

  const handleMove: OnMove = useCallback(
    (...args) => {
      notifyWireTransform();
      onMove(...args);
    },
    [onMove],
  );

  // Node drag/resize moves the anchor DOM but does not fire onMove (viewport
  // only). Without this, wires freeze during a node drag and stay stale after
  // drop. Position/dimension changes kick the wire engine's settle loop so
  // wires track the node — the same signal path viewport moves already use.
  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === "position" || c.type === "dimensions")) {
        notifyWireTransform();
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        className="graph-flow-container"
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={flowNodeTypes}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={handlePaneClick}
        onMove={handleMove}
        onMoveEnd={handleMove}
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
      <div className="pointer-events-auto absolute right-3 top-3 z-50">
        <ConnectionLegend />
      </div>
      <TokenContextBar />
      <TokenConnectionMenu />
      <JumpTooltip />
    </div>
  );
}
