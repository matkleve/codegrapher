import { useMemo } from "react";
import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type OnMove,
} from "@xyflow/react";
import { TokenReferencesDropdown } from "@/components/code/TokenReferencesDropdown";
import { flowNodeTypes } from "@/components/nodes/flowNodeTypes";
import {
  buildPreviewFlowEdge,
  PREVIEW_EDGE_ID,
  useGraphInteraction,
} from "@/context/GraphInteractionContext";

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
        panOnScroll
        panOnScrollMode="free"
        zoomOnScroll
        zoomOnPinch
        panOnDrag
      />
      <TokenReferencesDropdown />
    </>
  );
}
