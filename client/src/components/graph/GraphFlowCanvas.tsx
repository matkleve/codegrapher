import {
  ReactFlow,
  type Edge,
  type Node,
  type OnMove,
  type useEdgesState,
  type useNodesState,
} from "@xyflow/react";
import { TokenReferenceCards } from "@/components/code/TokenReferenceCards";
import { TokenReferencesDropdown } from "@/components/code/TokenReferencesDropdown";
import { GraphPinchZoomBoost } from "@/components/graph/GraphPinchZoomBoost";
import { PreviewEdgeOverlay } from "@/components/graph/PreviewEdgeOverlay";
import { flowNodeTypes } from "@/components/nodes/flowNodeTypes";

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
  return (
    <>
      <ReactFlow
        className="graph-flow-container"
        nodes={nodes}
        edges={edges}
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
        panOnScroll
        panOnScrollMode="free"
        zoomOnScroll
        zoomOnPinch
        panOnDrag
      >
        <PreviewEdgeOverlay />
      </ReactFlow>
      <GraphPinchZoomBoost />
      <TokenReferencesDropdown />
      <TokenReferenceCards />
    </>
  );
}
