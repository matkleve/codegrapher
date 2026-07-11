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
const CHIP_DOT_DIAMETER = 4;
const CHIP_DOT_GAP = 4;
const SAME_ROW_THRESHOLD = 10;
const MIN_ARC_BULGE = 32;
const MAX_ARC_BULGE = 72;
const ARC_BULGE_DX_FACTOR = 0.2;
const LANE_STAGGER = 12;
/** Horizontal run-out from a port before the curve bends (px). */
const MIN_HORIZONTAL_EXIT = 30;

import { getByHandle } from "@/lib/elementRegistry";

function exitControlX(
  anchorX: number,
  side: "left" | "right",
  stub: number,
): number {
  return side === "right" ? anchorX + stub : anchorX - stub;
}

function entryControlX(
  anchorX: number,
  side: "left" | "right",
  stub: number,
): number {
  return side === "left" ? anchorX - stub : anchorX + stub;
}

function findTargetAnchor(
  handleId: string,
  side: "left" | "right",
): HTMLElement | null {
  const fromRegistry = getByHandle(handleId, side);
  if (fromRegistry) return fromRegistry;

  return document.querySelector<HTMLElement>(
    `[data-flow-anchor-target="${CSS.escape(handleId)}"][data-flow-anchor="${side}"]`,
  );
}

function sideForEndpoint(role: EndpointRole): "left" | "right" {
  return role === "from" ? "right" : "left";
}

function flowAnchorVisible(dot: HTMLElement | null): boolean {
  return Boolean(dot?.isConnected && dot.classList.contains("flow-anchor-on"));
}

function syntheticChipAnchor(
  chipRect: DOMRect,
  side: "left" | "right",
  svgBox: DOMRect,
): { x: number; y: number } {
  const inset = CHIP_DOT_GAP + CHIP_DOT_DIAMETER / 2;
  return {
    x:
      (side === "right" ? chipRect.right + inset : chipRect.left - inset) -
      svgBox.left,
    y: chipRect.top + chipRect.height / 2 - svgBox.top,
  };
}

/** Detour distance so a wire clears token chip labels between endpoints. */
export function chipClearance(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
): number {
  let maxH = 20;
  for (const el of [fromEl, toEl]) {
    if (!el?.isConnected) continue;
    maxH = Math.max(maxH, el.getBoundingClientRect().height);
  }
  return Math.ceil(maxH / 2) + 16;
}

export function laneOffsetFromEdgeId(edgeId: string): number {
  const match = edgeId.match(/-(\d+)$/);
  if (!match) return 0;
  const index = Number(match[1]);
  if (!Number.isFinite(index)) return 0;
  return (index % 3) - 1;
}

export type CubicPathOptions = {
  clearance?: number;
  lane?: number;
  obstacles?: ChipRect[];
};

export type ChipRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Endpoint chip boxes in overlay-local coordinates (for skirt routing). */
export function chipObstaclesInSvg(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
): ChipRect[] {
  const pad = 3;
  const rects: ChipRect[] = [];
  for (const el of [fromEl, toEl]) {
    if (!el?.isConnected) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    rects.push({
      left: r.left - svgBox.left - pad,
      top: r.top - svgBox.top - pad,
      right: r.right - svgBox.left + pad,
      bottom: r.bottom - svgBox.top + pad,
    });
  }
  return rects;
}

function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: ChipRect,
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < rect.left || minX > rect.right || maxY < rect.top || minY > rect.bottom) {
    return false;
  }
  for (const t of [0.2, 0.4, 0.5, 0.6, 0.8]) {
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return true;
    }
  }
  return false;
}

function skirtDepth(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ChipRect[],
  clearance: number,
  sameRow: boolean,
  lane: number,
): number {
  let depth = sameRow ? clearance * 0.85 : 0;
  for (const rect of obstacles) {
    if (!segmentIntersectsRect(x1, y1, x2, y2, rect)) continue;
    depth = Math.max(depth, rect.bottom - Math.max(y1, y2) + 8);
  }
  return depth + Math.abs(lane) * 8;
}

function elementAnchor(
  el: HTMLElement,
  side: "left" | "right",
  box: DOMRect,
): ResolvedAnchor {
  const chipRect = el.getBoundingClientRect();
  const dot = el.querySelector<HTMLElement>(`[data-flow-anchor="${side}"]`);
  if (dot && flowAnchorVisible(dot)) {
    const rect = dot.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2 - box.left,
        y: rect.top + rect.height / 2 - box.top,
        side,
        el,
        token: el.dataset.symbolName,
      };
    }
  }

  if (dot?.isConnected) {
    const pt = syntheticChipAnchor(chipRect, side, box);
    return { x: pt.x, y: pt.y, side, el, token: el.dataset.symbolName };
  }

  const x =
    (side === "right" ? chipRect.right : chipRect.left) -
    box.left +
    (side === "right" ? ANCHOR_OUTSET : -ANCHOR_OUTSET);
  const y = chipRect.top + chipRect.height / 2 - box.top;
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
 * (incoming). Shallow spans extend stubs left/right, then skirt below any chip
 * box the chord would cross so the stroke does not cover token labels.
 */
export function cubicPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "left" | "right" = "right",
  toSide: "left" | "right" = "left",
  opts?: CubicPathOptions,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const clearance = opts?.clearance ?? MIN_ARC_BULGE;
  const lane = opts?.lane ?? 0;
  const laneShift = lane * LANE_STAGGER;
  const obstacles = opts?.obstacles ?? [];
  const sameRow = absDy < SAME_ROW_THRESHOLD;
  const shallowSlope = sameRow || absDy < absDx * 0.5;

  let c1x: number;
  let c2x: number;
  let c1y = y1;
  let c2y = y2;

  if (shallowSlope) {
    const bulge =
      Math.max(
        clearance,
        MIN_ARC_BULGE,
        Math.min(MAX_ARC_BULGE, absDx * ARC_BULGE_DX_FACTOR),
      ) + Math.abs(laneShift);
    const exitBulge = fromSide === "right" ? bulge : -bulge;
    const entryBulge = toSide === "left" ? -bulge : bulge;
    if (sameRow && absDx < MIN_HORIZONTAL_EXIT * 2) {
      c1x = x1 + dx * 0.45 + exitBulge * 0.35;
      c2x = x2 - dx * 0.45 + entryBulge * 0.35;
    } else {
      c1x = exitControlX(x1, fromSide, MIN_HORIZONTAL_EXIT) + exitBulge;
      c2x = entryControlX(x2, toSide, MIN_HORIZONTAL_EXIT) + entryBulge;
    }
    const skirt = skirtDepth(x1, y1, x2, y2, obstacles, clearance, sameRow, lane);
    if (skirt > 0) {
      c1y = y1 + skirt;
      c2y = y2 + skirt;
    }
  } else {
    c1x = exitControlX(x1, fromSide, MIN_HORIZONTAL_EXIT);
    c2x = entryControlX(x2, toSide, MIN_HORIZONTAL_EXIT);
    const skirt = skirtDepth(x1, y1, x2, y2, obstacles, clearance, false, lane);
    if (skirt > 0) {
      c2y = y2 + skirt;
    }
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
