import type { GraphData } from "@/types";

export type OverrideInfo = {
  parentClass: string;
  parentGraphNodeId: string;
  methodName: string;
};

/** Client-side override detection from structural `extends` edges + method name. */
export function findMethodOverride(
  graphData: GraphData | null,
  classGraphNodeId: string,
  methodName: string,
): OverrideInfo | null {
  if (!graphData) return null;

  const parentEdge = graphData.edges.find(
    (e) => e.type === "extends" && e.source === classGraphNodeId,
  );
  if (!parentEdge) return null;

  const parentNode = graphData.nodes.find((n) => n.id === parentEdge.target);
  if (!parentNode || parentNode.type !== "class") return null;

  const parentHasMethod =
    graphData.nodes.some(
      (n) =>
        n.type === "method" &&
        n.parent === parentEdge.target &&
        n.label === methodName,
    ) || new RegExp(`\\b${methodName}\\s*\\(`).test(parentNode.code);
  if (!parentHasMethod) return null;

  return {
    parentClass: parentNode.label,
    parentGraphNodeId: parentEdge.target,
    methodName,
  };
}
