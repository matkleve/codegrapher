import type { AnchorRef } from "@/lib/previewEdgeTypes";

export type ResolvedAnchor = {
  x: number;
  y: number;
  side: "left" | "right";
  el: HTMLElement | null;
  token?: string;
  kind?: string;
};

export type EndpointRole = "from" | "to";

const ANCHOR_OUTSET = 9;
const SAME_ROW_THRESHOLD = 10;
const MIN_ARC_BULGE = 22;
const MAX_ARC_BULGE = 48;

function findTargetAnchor(
  handleId: string,
  side: "left" | "right",
): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-flow-anchor-target="${CSS.escape(handleId)}"][data-flow-anchor="${side}"]`,
  );
}

function sideForEndpoint(role: EndpointRole): "left" | "right" {
  return role === "from" ? "right" : "left";
}

function elementAnchor(
  el: HTMLElement,
  side: "left" | "right",
  box: DOMRect,
): ResolvedAnchor {
  const dot = el.querySelector<HTMLElement>(`[data-flow-anchor="${side}"]`);
  if (dot?.isConnected) {
    const rect = dot.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - box.left,
      y: rect.top + rect.height / 2 - box.top,
      side,
      el,
      token: el.dataset.symbolName,
    };
  }

  const rect = el.getBoundingClientRect();
  const x =
    (side === "right" ? rect.right : rect.left) -
    box.left +
    (side === "right" ? ANCHOR_OUTSET : -ANCHOR_OUTSET);
  const y = rect.top + rect.height / 2 - box.top;
  return { x, y, side, el, token: el.dataset.symbolName };
}

export function resolvePreviewAnchor(
  ref: AnchorRef,
  svgBox: DOMRect,
  role: EndpointRole,
): ResolvedAnchor | null {
  const side = sideForEndpoint(role);

  if (ref.type === "element") {
    if (!ref.el.isConnected) return null;
    const side = ref.side ?? sideForEndpoint(role);
    return elementAnchor(ref.el, side, svgBox);
  }

  const anchor =
    findTargetAnchor(ref.handle, side) ??
    findTargetAnchor(ref.handle, side === "right" ? "left" : "right");
  if (!anchor?.isConnected) return null;

  const rect = anchor.getBoundingClientRect();
  const anchorSide = anchor.getAttribute("data-flow-anchor") as "left" | "right";
  const x = rect.left + rect.width / 2 - svgBox.left;
  const y = rect.top + rect.height / 2 - svgBox.top;
  return { x, y, side: anchorSide ?? side, el: anchor };
}

/**
 * Cubic wire — exits `from` on the right (outgoing), enters `to` on the left
 * (incoming). Arcs above same-row spans so the stroke does not cut through text.
 */
export function cubicPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "left" | "right" = "right",
  toSide: "left" | "right" = "left",
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const sameRow = Math.abs(dy) < SAME_ROW_THRESHOLD;

  let c1x = x1 + dx * 0.45;
  let c2x = x2 - dx * 0.45;
  let c1y: number;
  let c2y: number;

  if (sameRow) {
    const bulge = -Math.max(MIN_ARC_BULGE, Math.min(MAX_ARC_BULGE, Math.abs(dx) * 0.12));
    c1y = y1 + bulge;
    c2y = y2 + bulge;
  } else {
    const fromOut = fromSide === "right" ? ANCHOR_OUTSET * 2 : -ANCHOR_OUTSET * 2;
    const toOut = toSide === "left" ? -ANCHOR_OUTSET * 2 : ANCHOR_OUTSET * 2;
    c1x = x1 + fromOut + dx * 0.35;
    c2x = x2 + toOut - dx * 0.35;
    const verticalPull = Math.sign(dy || 1) * Math.min(Math.abs(dy) * 0.25, 20);
    c1y = y1 + verticalPull;
    c2y = y2 - verticalPull;
  }

  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

/** Short horizontal/vertical stub — straight segment, no arc bulge. */
export function straightPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
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
