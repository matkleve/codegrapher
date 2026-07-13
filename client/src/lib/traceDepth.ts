import { RELATIVE_MAX_DEPTH } from "@/lib/lexicalGraph";

/** Canonical tuning — focus (committed trace) vs hover (pointer emphasis). */
export const TRACE_TUNING = {
  focus: {
    floor: 0.2,
    curve: 0.85,
    wireAtFocus: 0.8,
    chipAtFocus: 0.55,
    chipProvenanceRatio: 0.88,
  },
  hover: {
    floor: 0.58,
    curve: 0.5,
    wireAtFocus: 1,
    wireGlowAtFocus: 0.12,
    chipAtFocus: 1,
  },
  pending: {
    chipAtPending: 0.52,
  },
  glow: {
    baselineRatio: 0.08,
    pathRatio: 0.08,
    strokeFocus: 5,
    strokeProvenance: 3,
  },
} as const;

export type TraceSituation = "pending" | "focus" | "hover";
export type TraceSurface = "wire" | "wireGlow" | "chip";

/** @deprecated Use `TRACE_TUNING.focus.floor` — keep in sync with `--trace-depth-min-opacity`. */
export const TRACE_DEPTH_MIN_OPACITY = TRACE_TUNING.focus.floor;
/** @deprecated Use `TRACE_TUNING.focus.curve`. */
export const TRACE_DEPTH_CURVE = TRACE_TUNING.focus.curve;
/** @deprecated Use `TRACE_TUNING.hover.floor`. */
export const TRACE_EMPHASIS_MIN_OPACITY = TRACE_TUNING.hover.floor;
/** @deprecated Use `TRACE_TUNING.hover.curve`. */
export const TRACE_EMPHASIS_CURVE = TRACE_TUNING.hover.curve;
/** @deprecated Use `TRACE_TUNING.glow.pathRatio`. */
export const TRACE_GLOW_PATH_RATIO = TRACE_TUNING.glow.pathRatio;
/** @deprecated Use `TRACE_TUNING.glow.baselineRatio`. */
export const TRACE_GLOW_BASELINE_RATIO = TRACE_TUNING.glow.baselineRatio;
/** @deprecated Use `TRACE_TUNING.focus.wireAtFocus`. */
export const TRACE_WIRE_SESSION_PATH_AT_FOCUS = TRACE_TUNING.focus.wireAtFocus;
/** @deprecated Use `TRACE_TUNING.focus.chipAtFocus`. */
export const TRACE_CHIP_SESSION_OPACITY = TRACE_TUNING.focus.chipAtFocus;
/** @deprecated Use `TRACE_TUNING.focus.chipProvenanceRatio`. */
export const TRACE_CHIP_PROVENANCE_RATIO = TRACE_TUNING.focus.chipProvenanceRatio;
/** @deprecated Use `TRACE_TUNING.hover.wireAtFocus`. */
export const TRACE_WIRE_EMPHASIS_PATH_AT_FOCUS = TRACE_TUNING.hover.wireAtFocus;
/** @deprecated Use `TRACE_TUNING.hover.wireGlowAtFocus`. */
export const TRACE_WIRE_EMPHASIS_GLOW_AT_FOCUS = TRACE_TUNING.hover.wireGlowAtFocus;
/** @deprecated Use `TRACE_TUNING.glow.strokeFocus`. */
export const TRACE_GLOW_STROKE_FOCUS = TRACE_TUNING.glow.strokeFocus;
/** @deprecated Use `TRACE_TUNING.glow.strokeProvenance`. */
export const TRACE_GLOW_STROKE_PROVENANCE = TRACE_TUNING.glow.strokeProvenance;

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

function curveOpacity(
  depth: number,
  maxDepth: number,
  floor: number,
  curve: number,
  peak = 1,
): number {
  if (depth <= 1) return peak;
  const clamped = clampTraceDepth(depth, maxDepth);
  if (maxDepth <= 1) return floor;
  const t = (maxDepth - clamped) / (maxDepth - 1);
  return floor + (peak - floor) * Math.pow(t, curve);
}

function focusPathCurve(depth: number, maxDepth: number): number {
  return curveOpacity(depth, maxDepth, TRACE_TUNING.focus.floor, TRACE_TUNING.focus.curve);
}

function hoverPathCurve(depth: number, maxDepth: number): number {
  return curveOpacity(
    depth,
    maxDepth,
    TRACE_TUNING.hover.floor,
    TRACE_TUNING.hover.curve,
  );
}

/** Unified strength API — one curve family per situation, surface-specific anchors at d=1. */
export function traceStrength(
  situation: TraceSituation,
  surface: TraceSurface,
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): number {
  const clamped = clampTraceDepth(depth, maxDepth);

  if (surface === "chip") {
    if (situation === "pending") {
      return TRACE_TUNING.pending.chipAtPending;
    }
    if (situation === "hover") {
      if (clamped <= 1) return TRACE_TUNING.hover.chipAtFocus;
      return hoverPathCurve(clamped, maxDepth);
    }
    if (clamped <= 1) return TRACE_TUNING.focus.chipAtFocus;
    return focusPathCurve(clamped, maxDepth) * TRACE_TUNING.focus.chipProvenanceRatio;
  }

  if (surface === "wire") {
    if (situation === "hover") {
      if (clamped <= 1) return TRACE_TUNING.hover.wireAtFocus;
      return hoverPathCurve(clamped, maxDepth);
    }
    if (clamped <= 1) return TRACE_TUNING.focus.wireAtFocus;
    return focusPathCurve(clamped, maxDepth);
  }

  if (situation === "hover") {
    if (clamped <= 1) return TRACE_TUNING.hover.wireGlowAtFocus;
    return hoverPathCurve(clamped, maxDepth) * TRACE_TUNING.glow.pathRatio;
  }
  const pathBase =
    clamped <= 1 ? TRACE_TUNING.focus.wireAtFocus : focusPathCurve(clamped, maxDepth);
  const ratio =
    clamped <= 1 ? TRACE_TUNING.glow.baselineRatio : TRACE_TUNING.glow.pathRatio;
  return pathBase * ratio;
}

/** Focus/rest base curve — peak 1 at d=1 (wire provenance decay uses `traceStrength`). */
export function tracePathOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): number {
  return focusPathCurve(depth, maxDepth);
}

/** Pointer hover curve — flatter, higher floor at max depth. */
export function traceEmphasisPathOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): number {
  return hoverPathCurve(depth, maxDepth);
}

/** Color strength for chip fill + ink (0–1) — never applied as element opacity. */
export function traceChipColorStrength(
  depth: number,
  pointerHover = false,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): number {
  return traceStrength(pointerHover ? "hover" : "focus", "chip", depth, maxDepth);
}

/** @deprecated Use traceChipColorStrength — strength drives color-mix, not opacity. */
export const traceChipOpacity = traceChipColorStrength;

/** Wire glow halo — always weaker than path at the same distance. */
export function traceGlowOpacity(
  depth: number,
  maxDepth: number = RELATIVE_MAX_DEPTH,
  emphasized = false,
): number {
  return traceStrength(emphasized ? "hover" : "focus", "wireGlow", depth, maxDepth);
}

export function traceGlowStrokeWidth(depth: number): number {
  return depth <= 1 ? TRACE_TUNING.glow.strokeFocus : TRACE_TUNING.glow.strokeProvenance;
}

/** Preview wire path + glow — session vs pointer emphasis. */
export function traceWireOpacity(
  depth: number,
  emphasized = false,
  maxDepth: number = RELATIVE_MAX_DEPTH,
): { path: number; glow: number } {
  const situation = emphasized ? "hover" : "focus";
  return {
    path: traceStrength(situation, "wire", depth, maxDepth),
    glow: traceStrength(situation, "wireGlow", depth, maxDepth),
  };
}
