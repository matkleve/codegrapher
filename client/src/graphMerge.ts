import type { GraphData, GraphEdge, GraphNode } from "./types";

function edgeKey(edge: GraphEdge): string {
  return `${edge.source}|${edge.target}|${edge.type}|${edge.label ?? ""}`;
}

export function mergeGraphData(existing: GraphData | null, incoming: GraphData): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  for (const node of existing?.nodes ?? []) {
    nodeMap.set(node.id, node);
  }
  for (const node of incoming.nodes) {
    nodeMap.set(node.id, node);
  }

  const edgeMap = new Map<string, GraphEdge>();
  for (const edge of existing?.edges ?? []) {
    edgeMap.set(edgeKey(edge), edge);
  }
  for (const edge of incoming.edges) {
    edgeMap.set(edgeKey(edge), edge);
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
  };
}
