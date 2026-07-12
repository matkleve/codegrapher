import { RELATIVE_MAX_DEPTH } from "@/lib/lexicalGraph";

/** Floor opacity at `maxDepth` — keep in sync with `--trace-depth-min-opacity` in theme CSS. */
export const TRACE_DEPTH_MIN_OPACITY = 0.2;

/** Power curve for distance decay (lower = flatter). */
export const TRACE_DEPTH_CURVE = 0.85;

/** Glow opacity ≈ path opacity × ratio at provenance distances. */
export const TRACE_GLOW_PATH_RATIO = 0.172;
export const TRACE_GLOW_BASELINE_RATIO = 0.13;

/** Pointer emphasis within an active trace — multiplies curve opacity, capped at 1. */
export const TRACE_POINTER_HOVER_BOOST = 1.35;

/** Extra glow scale when the pointer emphasizes a wire at focus distance. */
export const TRACE_POINTER_GLOW_BOOST = 2.2;

/** Graph distance from the focus token (1 = focus). */
export function clampTraceDepth(depth: number, maxDepth = RELATIVE_MAX_DEPTH): number {
  return Math.max(1, Math.min(depth, maxDepth));
}

/** `PreviewEdgeSpec.hop` — omitted at focus distance, else 2…maxDepth. */
export function previewHopFromDepth(depth: number, maxDepth = RELATIVE_MAX_DEPTH): number | undefined {
  const clamped = clampTraceDepth(depth, maxDepth);
  if (clamped <= 1) return undefined;
  return clamped;
}

export function depthFromHop(hop: number | undefined): number {
  if (hop == null || hop <= 1) return 1;
  return hop;
}

/**
 * Single brightness curve for wires, chips, sockets, and lit code lines.
 * Distance 1 → 1.0; scales to `TRACE_DEPTH_MIN_OPACITY` at `maxDepth`.
 */
export function tracePathOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): number {
  if (depth <= 1) return 1;
  const clamped = clampTraceDepth(depth, maxDepth);
  if (maxDepth <= 1) return TRACE_DEPTH_MIN_OPACITY;
  const t = (maxDepth - clamped) / (maxDepth - 1);
  return (
    TRACE_DEPTH_MIN_OPACITY +
    (1 - TRACE_DEPTH_MIN_OPACITY) * Math.pow(t, TRACE_DEPTH_CURVE)
  );
}

export function applyPointerHoverBoost(
  opacity: number,
  pointerHover: boolean,
): number {
  if (!pointerHover) return opacity;
  return Math.min(1, opacity * TRACE_POINTER_HOVER_BOOST);
}

/** Lit-surface strength at graph distance, optionally boosted by pointer emphasis. */
export function traceStrengthAtDistance(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  pointerHover = false,
): number {
  return applyPointerHoverBoost(tracePathOpacity(depth, maxDepth), pointerHover);
}

/** Wire glow halo opacity at this graph distance. */
export function traceGlowOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  pointerHover = false,
): number {
  const path = tracePathOpacity(depth, maxDepth);
  const ratio = depth <= 1 ? TRACE_GLOW_BASELINE_RATIO : TRACE_GLOW_PATH_RATIO;
  let glow = path * ratio;
  if (pointerHover) {
    glow = Math.min(0.42, glow * TRACE_POINTER_GLOW_BOOST);
  }
  return glow;
}

/** Preview wire path + glow from graph distance, with optional pointer emphasis. */
export function traceWireOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  pointerHover = false,
): { path: number; glow: number } {
  return {
    path: traceStrengthAtDistance(depth, maxDepth, pointerHover),
    glow: traceGlowOpacity(depth, maxDepth, pointerHover),
  };
}
