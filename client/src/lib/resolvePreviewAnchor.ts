import type { AnchorRef } from "@/lib/previewEdgeTypes";

export type ResolvedAnchor = {
  x: number;
  y: number;
  side: "left" | "right";
  el: HTMLElement | null;
  token?: string;
  kind?: string;
};

function findTargetAnchor(
  handleId: string,
  side: "left" | "right",
): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      `[data-flow-anchor-target="${handleId}"][data-flow-anchor="${side}"]`,
    ) ??
    document.querySelector<HTMLElement>(`[data-flow-anchor-target="${handleId}"]`)
  );
}

function elementAnchor(
  el: HTMLElement,
  preferSide: "left" | "right",
  box: DOMRect,
): ResolvedAnchor {
  const rect = el.getBoundingClientRect();
  const side = preferSide;
  const x =
    (side === "right" ? rect.right : rect.left) -
    box.left +
    (side === "right" ? 9 : -9);
  const y = rect.top + rect.height / 2 - box.top;
  return { x, y, side, el, token: el.dataset.symbolName };
}

export function resolvePreviewAnchor(
  ref: AnchorRef,
  otherX: number | null,
  svgBox: DOMRect,
): ResolvedAnchor | null {
  if (ref.type === "element") {
    const rect = ref.el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const preferSide =
      otherX != null && otherX < centerX - svgBox.left ? "right" : "left";
    if (!ref.el.isConnected) return null;
    return elementAnchor(ref.el, preferSide, svgBox);
  }

  const probe =
    findTargetAnchor(ref.handle, "left") ?? findTargetAnchor(ref.handle, "right");
  if (!probe?.isConnected) return null;

  const probeRect = probe.getBoundingClientRect();
  const targetLeftOfPeer =
    otherX != null
      ? otherX > probeRect.left + probeRect.width / 2
      : true;

  const side = targetLeftOfPeer ? "right" : "left";
  const anchor =
    findTargetAnchor(ref.handle, side) ?? probe;
  if (!anchor?.isConnected) return null;

  const rect = anchor.getBoundingClientRect();
  const anchorSide = anchor.getAttribute("data-flow-anchor") as "left" | "right";
  const x =
    (anchorSide === "right" ? rect.right : rect.left) -
    svgBox.left +
    (anchorSide === "right" ? 9 : -9);
  const y = rect.top + rect.height / 2 - svgBox.top;
  return { x, y, side: anchorSide ?? side, el: anchor };
}

export function cubicPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dx = x2 - x1;
  const c1x = x1 + dx * 0.45;
  const c2x = x2 - dx * 0.45;
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
}

/** Short segment along wire end for hit-testing (~1cm). */
export function wireHitSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  end: "from" | "to",
  length = 46,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  if (end === "from") {
    return `M ${x1} ${y1} L ${x1 + ux * length} ${y1 + uy * length}`;
  }
  return `M ${x2} ${y2} L ${x2 - ux * length} ${y2 - uy * length}`;
}
