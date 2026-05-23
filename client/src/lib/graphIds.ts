/** Safe React Flow element ids (graph ids contain `:` and `/`). */
export function toFlowId(graphId: string): string {
  return graphId.replaceAll(":", "_c_").replaceAll("/", "_s_");
}

export function flowEdgeId(edge: {
  source: string;
  target: string;
  type: string;
  label?: string;
}): string {
  return toFlowId(
    `edge:${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`,
  );
}
