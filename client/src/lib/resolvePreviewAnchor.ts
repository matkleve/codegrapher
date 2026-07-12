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
const MIN_ARC_BULGE = 28;
const MAX_ARC_BULGE = 64;
const ARC_BULGE_DX_FACTOR = 0.14;
const LANE_SPREAD = 14;
/** Horizontal run-out from a port before the curve bends (px). */
const MIN_HORIZONTAL_EXIT = 28;
/** Shallow if vertical span is less than this fraction of horizontal run. */
const SHALLOW_SLOPE_RATIO = 0.55;
/** Below this chord length, a straight segment is cleaner than a cubic. */
const CUBIC_STRAIGHT_CHORD = 14;
/** Full-strength handle reach at or above this chord (px). */
const CUBIC_FULL_CHORD = 88;

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

/** Bend distance for shallow wires — scales with chip height between endpoints. */
export function chipClearance(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
): number {
  let maxH = 20;
  for (const el of [fromEl, toEl]) {
    if (!el?.isConnected) continue;
    maxH = Math.max(maxH, el.getBoundingClientRect().height);
  }
  return Math.ceil(maxH / 2) + 12;
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
};

/** Clamp horizontal handle reach so control points do not cross on short spans. */
function cubicHorizontalReach(absDx: number, requestedStub: number, requestedSpread: number): {
  stub: number;
  spread: number;
} {
  const maxHalfReach = Math.max((absDx - 6) / 2, 5);
  const stub = Math.min(requestedStub, maxHalfReach);
  const spread = Math.min(requestedSpread, Math.max(maxHalfReach - stub, 0));
  return { stub, spread };
}

/** Scale vertical bend so shallow wires do not overshoot and loop when endpoints are close. */
function cubicBendOffset(
  absDx: number,
  absDy: number,
  clearance: number,
  laneY: number,
): number {
  const floor = Math.max(absDx * 0.32, absDy * 0.6 + 8, 10);
  return Math.min(clearance + Math.abs(laneY), floor);
}

/** Pick port sides from relative X so handles aim toward the target, not away from it. */
export function cubicPortSides(
  x1: number,
  x2: number,
): { fromSide: "left" | "right"; toSide: "left" | "right" } {
  if (x2 >= x1) {
    return { fromSide: "right", toSide: "left" };
  }
  return { fromSide: "left", toSide: "right" };
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

/** Port sides for sig-type → param typesetting — type exits right, param enters left. */
export function typesettingPortSides(
  _fromX: number,
  _toX: number,
): { fromSide: "right"; toSide: "left" } {
  return { fromSide: "right", toSide: "left" };
}

/** Typesetting anchors on type right / param left; above-line route spans the signature row. */
export function resolveTypesettingAnchors(
  fromRef: AnchorRef,
  toRef: AnchorRef,
  svgBox: DOMRect,
): { fromPt: ResolvedAnchor; toPt: ResolvedAnchor } | null {
  const roughFrom = resolvePreviewAnchor(fromRef, svgBox, "from");
  const roughTo = resolvePreviewAnchor(toRef, svgBox, "to");
  if (!roughFrom || !roughTo) return null;
  if (!roughFrom.el || !roughTo.el) {
    return { fromPt: roughFrom, toPt: roughTo };
  }

  const sides = typesettingPortSides(roughFrom.x, roughTo.x);
  const fromPt = resolvePreviewAnchor(
    { type: "element", el: roughFrom.el, side: sides.fromSide },
    svgBox,
    "from",
  );
  const toPt = resolvePreviewAnchor(
    { type: "element", el: roughTo.el, side: sides.toSide },
    svgBox,
    "to",
  );
  if (!fromPt || !toPt) return null;
  return { fromPt, toPt };
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
 * Cubic wire — exit/enter horizontally from each port, with shallow spans
 * bending below the label row so the stroke does not cover token text.
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
  const chord = Math.hypot(absDx, absDy);

  if (chord < CUBIC_STRAIGHT_CHORD) {
    return straightPath(x1, y1, x2, y2);
  }

  if (absDx < 2) {
    return straightPath(x1, y1, x2, y2);
  }

  const clearance = opts?.clearance ?? MIN_ARC_BULGE;
  const lane = opts?.lane ?? 0;
  const geoSides = cubicPortSides(x1, x2);
  const effFrom = chord < CUBIC_FULL_CHORD ? geoSides.fromSide : fromSide;
  const effTo = chord < CUBIC_FULL_CHORD ? geoSides.toSide : toSide;
  const shallow = absDx > 8 && absDy < absDx * SHALLOW_SLOPE_RATIO;
  const proximity = Math.min(1, chord / CUBIC_FULL_CHORD);

  const rawSpread = Math.max(
    clearance,
    MIN_ARC_BULGE,
    Math.min(MAX_ARC_BULGE, absDx * ARC_BULGE_DX_FACTOR),
  );
  const requestedStub = MIN_HORIZONTAL_EXIT * proximity + 8 * (1 - proximity);
  const { stub, spread } = cubicHorizontalReach(absDx, requestedStub, rawSpread);
  const exitSpread = effFrom === "right" ? spread : -spread;
  const entrySpread = effTo === "left" ? -spread : spread;
  const laneX = lane * 10;
  const laneY = lane * LANE_SPREAD;

  const c1x = exitControlX(x1, effFrom, stub) + exitSpread + laneX;
  const c2x = entryControlX(x2, effTo, stub) + entrySpread - laneX;

  let c1y = y1;
  let c2y = y2;

  if (shallow) {
    const bendY =
      Math.max(y1, y2) + cubicBendOffset(absDx, absDy, clearance, laneY);
    c1y = bendY;
    c2y = bendY;
  } else if (absDy < absDx) {
    c2y =
      Math.max(y1, y2) +
      cubicBendOffset(absDx, absDy, clearance * 0.55, laneY);
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

const MIN_TREE_SPINE_BULGE = 10;
const MAX_TREE_SPINE_BULGE = 28;
const TREE_SPINE_BULGE_FACTOR = 0.14;

/**
 * Curved gutter spine for fan buses — near-vertical runs bow into the gutter
 * so the shared lane reads like a tree trunk, not a straight dashed column.
 */
export function treeSpinePath(
  x: number,
  y1: number,
  y2: number,
  bulgeSide: "left" | "right" = "left",
): string {
  const dy = y2 - y1;
  if (Math.abs(dy) < 2) return straightPath(x, y1, x, y2);

  const bulge = Math.min(
    MAX_TREE_SPINE_BULGE,
    Math.max(MIN_TREE_SPINE_BULGE, Math.abs(dy) * TREE_SPINE_BULGE_FACTOR),
  );
  const sign = bulgeSide === "left" ? -1 : 1;
  const bowX = x + sign * bulge;
  const c1y = y1 + dy * 0.33;
  const c2y = y1 + dy * 0.67;
  return `M ${x} ${y1} C ${bowX} ${c1y}, ${bowX} ${c2y}, ${x} ${y2}`;
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

/** Middle span for jump affordance — excludes endpoint caps near token chips. */
export function wireHitMidSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  endCap = 52,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist <= endCap * 2) return "";
  const ux = dx / dist;
  const uy = dy / dist;
  const sx = x1 + ux * endCap;
  const sy = y1 + uy * endCap;
  const ex = x2 - ux * endCap;
  const ey = y2 - uy * endCap;
  return `M ${sx} ${sy} L ${ex} ${ey}`;
}
