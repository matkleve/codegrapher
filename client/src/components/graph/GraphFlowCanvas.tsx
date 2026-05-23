import { useMemo } from "react";
import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type OnMove,
} from "@xyflow/react";
import { TokenReferenceCards } from "@/components/code/TokenReferenceCards";
import { TokenReferencesDropdown } from "@/components/code/TokenReferencesDropdown";
import { GraphPinchZoomBoost } from "@/components/graph/GraphPinchZoomBoost";
import { flowEdgeTypes } from "@/components/graph/flowEdgeTypes";
import { flowNodeTypes } from "@/components/nodes/flowNodeTypes";
import {
  buildPreviewFlowEdges,
  useGraphInteraction,
} from "@/context/GraphInteractionContext";
import { CTRL_PREVIEW_EDGE_PREFIX } from "@/lib/ctrlPreviewHandles";

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
  const { previewEdges } = useGraphInteraction();

  const displayEdges = useMemo(() => {
    const base = edges.filter((e) => !e.id.startsWith(CTRL_PREVIEW_EDGE_PREFIX));
    const previews = buildPreviewFlowEdges(previewEdges);
    return [...base, ...previews];
  }, [edges, previewEdges]);

  return (
    <>
      <ReactFlow
        className="graph-flow-container"
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
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
      <GraphPinchZoomBoost />
      <TokenReferencesDropdown />
      <TokenReferenceCards />
    </>
  );
}
