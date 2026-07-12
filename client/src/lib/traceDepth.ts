import { RELATIVE_MAX_DEPTH } from "@/lib/lexicalGraph";

/** Floor opacity at `maxDepth` — keep in sync with `--trace-depth-min-opacity` in theme CSS. */
export const TRACE_DEPTH_MIN_OPACITY = 0.2;

/** Lit tier-1 chips/wires dimmed only while pointer emphasizes another trace member. */
export const TRACE_UNINVOLVED_IN_TRACE = 0.68;

/** Wire path + glow when pointer is on the wire or its endpoint chip. */
export const TRACE_WIRE_EMPHASIS_PATH_OPACITY = 1;
export const TRACE_WIRE_EMPHASIS_GLOW_OPACITY = 0.36;

/** Power curve for provenance decay during a committed trace. */
export const TRACE_DEPTH_CURVE = 1.25;

/** Flatter curve while pointer emphasizes one branch — hops stay readable. */
export const TRACE_DEPTH_CURVE_EMPHASIS = 0.55;

/** Floor opacity for provenance hops during pointer emphasis. */
export const TRACE_EMPHASIS_MIN_OPACITY = 0.44;

/** Glow opacity ≈ path opacity × ratio at provenance distances. */
export const TRACE_GLOW_PATH_RATIO = 0.172;
export const TRACE_GLOW_EMPHASIS_RATIO = 0.28;
export const TRACE_GLOW_BASELINE_RATIO = 0.16;

export type TraceStrengthMode = "baseline" | "emphasis";

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

function curveForMode(mode: TraceStrengthMode): number {
  return mode === "emphasis" ? TRACE_DEPTH_CURVE_EMPHASIS : TRACE_DEPTH_CURVE;
}

function floorForMode(mode: TraceStrengthMode): number {
  return mode === "emphasis" ? TRACE_EMPHASIS_MIN_OPACITY : TRACE_DEPTH_MIN_OPACITY;
}

/**
 * Path/chip opacity from graph distance. Scales with `maxDepth` so depth 10 at max 10
 * matches the old hop-5 fade when maxDepth was 5.
 */
export function tracePathOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  mode: TraceStrengthMode = "baseline",
): number {
  if (depth <= 1) {
    return mode === "emphasis" ? TRACE_UNINVOLVED_IN_TRACE : 1;
  }
  const clamped = clampTraceDepth(depth, maxDepth);
  if (maxDepth <= 1) return floorForMode(mode);
  const t = (maxDepth - clamped) / (maxDepth - 1);
  const floor = floorForMode(mode);
  return floor + (1 - floor) * Math.pow(t, curveForMode(mode));
}

/** Wire glow halo opacity at this graph distance. */
export function traceGlowOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  mode: TraceStrengthMode = "baseline",
): number {
  if (depth <= 1) {
    const ratio = mode === "emphasis" ? TRACE_GLOW_EMPHASIS_RATIO : TRACE_GLOW_BASELINE_RATIO;
    const base = mode === "emphasis" ? TRACE_UNINVOLVED_IN_TRACE : 1;
    return base * ratio;
  }
  const ratio = mode === "emphasis" ? TRACE_GLOW_EMPHASIS_RATIO : TRACE_GLOW_PATH_RATIO;
  return tracePathOpacity(depth, maxDepth, mode) * ratio;
}

/** Explicit wire opacities for emphasized vs chain. */
export function traceWireOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  mode: TraceStrengthMode = "baseline",
  emphasized = false,
): { path: number; glow: number } {
  if (emphasized) {
    return {
      path: TRACE_WIRE_EMPHASIS_PATH_OPACITY,
      glow: TRACE_WIRE_EMPHASIS_GLOW_OPACITY,
    };
  }
  const path = tracePathOpacity(depth, maxDepth, mode);
  return { path, glow: traceGlowOpacity(depth, maxDepth, mode) };
}
