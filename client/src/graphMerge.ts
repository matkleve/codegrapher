import type { GraphData, GraphEdge, GraphNode } from "./components/Graph";

function edgeKey(edge: GraphEdge): string {
  return `${edge.source}|${edge.target}|${edge.type}`;
}

function isLoadedNode(node: GraphNode): boolean {
  return node.loaded !== false;
}

export function mergeGraphData(
  existing: GraphData | null,
  incoming: GraphData,
): GraphData {
  const nodeMap = new Map<string, GraphNode>();

  for (const node of existing?.nodes ?? []) {
    nodeMap.set(node.id, node);
  }

  for (const node of incoming.nodes) {
    const prev = nodeMap.get(node.id);
    if (!prev) {
      nodeMap.set(node.id, node);
      continue;
    }
    if (isLoadedNode(node)) {
      nodeMap.set(node.id, { ...node, loaded: true });
    } else if (!isLoadedNode(prev)) {
      nodeMap.set(node.id, node);
    }
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

export function collectLoadedNodeIds(data: GraphData): Set<string> {
  return new Set(data.nodes.filter(isLoadedNode).map((n) => n.id));
}
