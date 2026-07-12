import type { GraphEdge, GraphNode } from "./parseTypes";
export { fullTextStartLine } from "./parseTypes";

export interface ParseAccumulator {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeIds: Set<string>;
  edgeKeys: Set<string>;
  limitReached: boolean;
  truncated: boolean;
}

export function createAccumulator(): ParseAccumulator {
  return {
    nodes: [],
    edges: [],
    nodeIds: new Set(),
    edgeKeys: new Set(),
    limitReached: false,
    truncated: false,
  };
}

export function addEdge(acc: ParseAccumulator, edge: GraphEdge): void {
  const key = `${edge.source}|${edge.target}|${edge.type}|${edge.label ?? ""}`;
  if (acc.edgeKeys.has(key)) return;
  acc.edgeKeys.add(key);
  acc.edges.push(edge);
}

export function addNode(
  acc: ParseAccumulator,
  node: GraphNode,
  maxNodes: number,
): boolean {
  if (acc.nodeIds.has(node.id)) return true;
  if (acc.nodes.length >= maxNodes) {
    acc.limitReached = true;
    acc.truncated = true;
    return false;
  }
  acc.nodeIds.add(node.id);
  acc.nodes.push(node);
  return true;
}
