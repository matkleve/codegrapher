import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

/**
 * Load menu only for tier-1 stubs anchored on the hovered chip — not cascaded
 * provenance loads (hop ≥ 2). See preview-edges.trace-strength.supplement.md.
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
