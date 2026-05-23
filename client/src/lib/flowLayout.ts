import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import { estimateNodeSize } from "@/lib/graphToFlow";

const RANK_SEP = 80;
const NODE_SEP = 40;

export function layoutFlowElements(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
  });

  for (const node of nodes) {
    const { width, height } = estimateNodeSize(node);
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const layoutNode = g.node(node.id);
    const { width, height } = estimateNodeSize(node);
    return {
      ...node,
      position: {
        x: layoutNode.x - width / 2,
        y: layoutNode.y - height / 2,
      },
    };
  });
}

export const FIT_VIEW_PADDING = 0.12;
