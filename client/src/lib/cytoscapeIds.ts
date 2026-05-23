/** Cytoscape element ids must not contain `:` or `/` (breaks selectors and layout). */
export function toCyElementId(graphId: string): string {
  return graphId.replace(/:/g, "_c_").replace(/\//g, "_s_");
}

export function toCyEdgeId(edgeId: string): string {
  return toCyElementId(edgeId);
}
