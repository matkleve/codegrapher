import type { Edge, Node } from "@xyflow/react";
import { isStructuralEdgeType } from "@/lib/buildStructuralEdges";

function isOverlayStructuralEdge(edge: Edge): boolean {
  const edgeType = edge.data?.edgeType;
  return typeof edgeType === "string" && isStructuralEdgeType(edgeType);
}

function overlayStructuralRestStyle(): { stroke: string; opacity: number } {
  return { stroke: "var(--muted-foreground)", opacity: 0 };
}

export function findShortestPath(
  edges: Edge[],
  fromId: string,
  toId: string,
): { nodeIds: string[]; edgeIds: string[] } | null {
  if (fromId === toId) return { nodeIds: [fromId], edgeIds: [] };

  const adj = new Map<string, { neighbor: string; edgeId: string }[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push({ neighbor: edge.target, edgeId: edge.id });
    adj.get(edge.target)!.push({ neighbor: edge.source, edgeId: edge.id });
  }

  const queue: string[] = [fromId];
  const prev = new Map<string, { node: string; edgeId: string } | null>();
  prev.set(fromId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const { neighbor, edgeId } of adj.get(current) ?? []) {
      if (prev.has(neighbor)) continue;
      prev.set(neighbor, { node: current, edgeId });
      queue.push(neighbor);
    }
  }

  if (!prev.has(toId)) return null;

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cur: string | null = toId;
  while (cur) {
    nodeIds.unshift(cur);
    const p = prev.get(cur);
    if (p) {
      edgeIds.unshift(p.edgeId);
      cur = p.node;
    } else {
      cur = null;
    }
  }
  return { nodeIds, edgeIds };
}

export function applyPathHighlight(
  nodes: Node[],
  edges: Edge[],
  nodeIds: string[],
  edgeIds: string[],
): { nodes: Node[]; edges: Edge[] } {
  const nodeSet = new Set(nodeIds);
  const edgeSet = new Set(edgeIds);
  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        pathHighlighted: nodeSet.has(n.id),
      },
    })),
    edges: edges.map((e) => ({
      ...e,
      hidden: edgeSet.has(e.id) ? false : e.hidden,
      className: edgeSet.has(e.id) ? "path-highlight" : undefined,
      animated: edgeSet.has(e.id) ? true : e.animated,
      style: edgeSet.has(e.id)
        ? { ...e.style, stroke: "var(--ring)", strokeWidth: 3, opacity: 1 }
        : e.style,
    })),
  };
}

export function clearPathHighlight(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: { ...n.data, pathHighlighted: false, selected: false },
    })),
    edges: edges.map((e) => {
      if (isOverlayStructuralEdge(e)) {
        return {
          ...e,
          hidden: true,
          className: undefined,
          style: overlayStructuralRestStyle(),
          animated: false,
        };
      }
      return {
        ...e,
        className: undefined,
        style:
          e.data?.edgeType === "imports"
            ? { stroke: "var(--primary)" }
            : { stroke: "var(--muted-foreground)" },
        animated: e.data?.edgeType === "imports",
      };
    }),
  };
}
