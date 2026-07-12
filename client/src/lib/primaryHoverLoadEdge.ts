import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

/**
 * Load menu for depth-1 stubs anchored on the hovered chip.
 */
export function primaryHoverLoadEdge(
  edges: readonly PreviewEdgeSpec[],
  chipEl: HTMLElement,
): PreviewEdgeSpec | undefined {
  return edges.find(
    (edge) =>
      edge.load != null &&
      (edge.hop == null || edge.hop < 2) &&
      edge.from.type === "element" &&
      edge.from.el === chipEl,
  );
}
