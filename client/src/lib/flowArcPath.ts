/**
 * Slight-arc path for an intra-line flow point (see canvas-values
 * supplement, "Two kinds of motion" — points curve rather than travel in a
 * straight line, so points converging on the same operator from different
 * operands don't overlap en route). Deliberately smaller/simpler than the
 * wire-to-wire `cubicPath` in resolvePreviewAnchor.ts — this is a short
 * intra-line hop, not a cross-graph wire.
 */
const MIN_BULGE = 6;
const MAX_BULGE = 16;
const BULGE_DISTANCE_FACTOR = 0.18;

export function flowArcPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;

  const bulge = Math.min(MAX_BULGE, Math.max(MIN_BULGE, distance * BULGE_DISTANCE_FACTOR));
  // Perpendicular unit vector, always bulging "up" (negative screen-Y) so
  // arcs read consistently above the code line rather than through it.
  const nx = -dy / distance;
  const ny = dx / distance;
  const sign = ny > 0 ? -1 : 1;
  const midX = (x1 + x2) / 2 + nx * bulge * sign;
  const midY = (y1 + y2) / 2 + ny * bulge * sign;

  return `M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}`;
}

/** Point along a quadratic bezier at `t` ∈ [0, 1] — used to place a travelling point mid-arc. */
export function pointOnArc(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): { x: number; y: number } {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  if (distance === 0) return { x: x1, y: y1 };

  const bulge = Math.min(MAX_BULGE, Math.max(MIN_BULGE, distance * BULGE_DISTANCE_FACTOR));
  const nx = -(y2 - y1) / distance;
  const ny = (x2 - x1) / distance;
  const sign = ny > 0 ? -1 : 1;
  const cx = (x1 + x2) / 2 + nx * bulge * sign;
  const cy = (y1 + y2) / 2 + ny * bulge * sign;

  const u = 1 - t;
  return {
    x: u * u * x1 + 2 * u * t * cx + t * t * x2,
    y: u * u * y1 + 2 * u * t * cy + t * t * y2,
  };
}
