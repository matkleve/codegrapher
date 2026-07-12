import { RELATIVE_MAX_DEPTH } from "@/lib/lexicalGraph";

/** Floor opacity at `maxDepth` — keep in sync with `--trace-depth-min-opacity` in theme CSS. */
export const TRACE_DEPTH_MIN_OPACITY = 0.2;

/** Power curve for distance decay — lower = stronger first relatives (depth 2–3). */
export const TRACE_DEPTH_CURVE = 1.25;

/** Glow opacity ≈ path opacity × this ratio at provenance distances. */
export const TRACE_GLOW_PATH_RATIO = 0.172;

/** Graph distance from the hovered token (1 = focus). */
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
 * Path/chip opacity from graph distance. Scales with `maxDepth` so depth 10 at max 10
 * matches the old hop-5 fade when maxDepth was 5.
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

/** Wire glow halo opacity at this graph distance. */
export function traceGlowOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): number {
  if (depth <= 1) return 0.22;
  return tracePathOpacity(depth, maxDepth) * TRACE_GLOW_PATH_RATIO;
}
