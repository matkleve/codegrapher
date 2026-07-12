import { areMemberDefSiblingHosts } from "@/lib/memberDefAnchor";
import type { AnchorRef, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import type { Node } from "@xyflow/react";

/** True when both ends anchor the same DOM host. */
export function isSameElementAnchor(from: AnchorRef, to: AnchorRef): boolean {
  return from.type === "element" && to.type === "element" && from.el === to.el;
}

/** Drop wires that loop on one chip or link member-def sibling hosts (title ↔ signature). */
export function isDegeneratePreviewEdge(
  spec: PreviewEdgeSpec,
  getNode: (id: string) => Node | undefined,
): boolean {
  if (spec.load) return false;

  const { from, to } = refinePreviewEdge(spec, getNode);
  if (isSameElementAnchor(from, to)) return true;
  if (
    from.type === "element" &&
    to.type === "element" &&
    areMemberDefSiblingHosts(from.el, to.el)
  ) {
    return true;
  }
  return false;
}

export function filterRenderablePreviewEdges(
  edges: PreviewEdgeSpec[],
  getNode: (id: string) => Node | undefined,
): PreviewEdgeSpec[] {
  return edges.filter((edge) => !isDegeneratePreviewEdge(edge, getNode));
}
