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
