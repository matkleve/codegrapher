import type { WireElements } from "@/lib/previewEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { depthFromHop, traceStrength } from "@/lib/traceDepth";
import { TRACE_STRENGTH_VAR } from "@/lib/traceLitApply";

export const WIRE_REVEAL_MS = 240;
/** Delay between wires at the same hop (fan-out siblings). */
export const WIRE_REVEAL_STAGGER_MS = 25;
/** Extra delay per graph hop beyond the hovered token (focus = hop 1). */
export const WIRE_REVEAL_HOP_MS = 100;

const DRAWING = "preview-edge-drawing";
const GLOW_DRAWING = "preview-edge-glow-drawing";
export const MARCHING = "preview-edge-marching";

export function wireRevealDelayMs(hop: number | undefined, tieIndex = 0): number {
  const depth = depthFromHop(hop);
  return (depth - 1) * WIRE_REVEAL_HOP_MS + tieIndex * WIRE_REVEAL_STAGGER_MS;
}

/** Focus-near wires first, then hop 2+, stable within each hop band. */
export function orderSpecsForReveal(specs: PreviewEdgeSpec[]): PreviewEdgeSpec[] {
  return specs
    .map((spec, index) => ({ spec, index }))
    .sort((a, b) => {
      const depthA = depthFromHop(a.spec.hop);
      const depthB = depthFromHop(b.spec.hop);
      if (depthA !== depthB) return depthA - depthB;
      return a.index - b.index;
    })
    .map(({ spec }) => spec);
}

export function buildRevealSchedule(
  specs: PreviewEdgeSpec[],
): Map<string, { depth: number; tie: number; delayMs: number }> {
  const tieByDepth = new Map<number, number>();
  const schedule = new Map<string, { depth: number; tie: number; delayMs: number }>();
  for (const spec of orderSpecsForReveal(specs)) {
    const depth = depthFromHop(spec.hop);
    const tie = tieByDepth.get(depth) ?? 0;
    tieByDepth.set(depth, tie + 1);
    schedule.set(spec.id, {
      depth,
      tie,
      delayMs: wireRevealDelayMs(spec.hop, tie),
    });
  }
  return schedule;
}

export function isWireRevealing(group: SVGGElement): boolean {
  return group.dataset.revealStarted === "1" && group.dataset.revealed !== "1";
}

function finishReveal(path: SVGPathElement, glow: SVGPathElement, group: SVGGElement): void {
  for (const el of [path, glow]) {
    for (const anim of el.getAnimations?.() ?? []) {
      if (isCssAnimation(anim)) continue;
      anim.cancel();
    }
  }
  path.classList.remove(DRAWING);
  glow.classList.remove(GLOW_DRAWING);
  path.style.removeProperty("stroke-dashoffset");
  path.style.removeProperty("stroke-dasharray");
  glow.style.removeProperty("stroke-dasharray");
  glow.style.removeProperty("stroke-dashoffset");
  glow.style.removeProperty("opacity");
  path.style.removeProperty("opacity");
  path.classList.add(MARCHING);
  glow.classList.add(MARCHING);
  group.dataset.revealed = "1";
  delete group.dataset.revealStarted;
}

function isCssAnimation(anim: Animation): boolean {
  return typeof CSSAnimation !== "undefined" && anim instanceof CSSAnimation;
}

/** Drop reveal draw overrides — keeps CSS marching (`proto-flow`) running on path. */
export function stripWireRevealStroke(
  path: SVGPathElement,
  glow: SVGPathElement,
): void {
  for (const el of [path, glow]) {
    for (const anim of el.getAnimations?.() ?? []) {
      if (isCssAnimation(anim)) continue;
      anim.cancel();
    }
  }
  path.classList.remove(DRAWING);
  glow.classList.remove(GLOW_DRAWING);
  path.classList.remove(MARCHING);
  glow.classList.remove(MARCHING);
  path.style.removeProperty("stroke-dasharray");
  path.style.removeProperty("stroke-dashoffset");
  glow.style.removeProperty("stroke-dasharray");
  glow.style.removeProperty("stroke-dashoffset");
  glow.style.removeProperty("opacity");
  path.style.removeProperty("opacity");
}

/** One solid dash the length of the path — WAAPI offset reveals source→target. */
function armPathStrokeDraw(path: SVGPathElement, len: number): void {
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
}

/**
 * Stroke draw along path (thin line, source→target).
 * Glow stays hidden until draw completes, then marches dashed in sync.
 */
export function playWireReveal(wire: WireElements, delayMs = 0): void {
  const { path, glow, group, spec } = wire;
  if (group.dataset.revealed === "1" || group.dataset.revealStarted === "1") {
    return;
  }

  const d = path.getAttribute("d");
  if (!d) return;

  const len = path.getTotalLength();
  if (len <= 0) return;

  if (typeof path.animate !== "function") {
    path.classList.add(MARCHING);
    glow.classList.add(MARCHING);
    group.dataset.revealed = "1";
    return;
  }

  const pathStrength = traceStrength("focus", "wire", depthFromHop(spec.hop));
  const glowStrength = traceStrength("focus", "wireGlow", depthFromHop(spec.hop));

  group.dataset.revealStarted = "1";
  path.classList.add(DRAWING);
  glow.classList.add(GLOW_DRAWING);
  path.classList.add("preview-edge-trace-strength");
  glow.classList.add("preview-edge-trace-strength");
  path.style.removeProperty("opacity");
  glow.style.removeProperty("stroke-dasharray");
  glow.style.removeProperty("stroke-dashoffset");
  path.style.setProperty(TRACE_STRENGTH_VAR, String(pathStrength));
  glow.style.setProperty(TRACE_STRENGTH_VAR, String(glowStrength));
  armPathStrokeDraw(path, len);
  glow.style.opacity = "0";

  const delay = delayMs;
  const timing: KeyframeAnimationOptions = {
    duration: WIRE_REVEAL_MS,
    delay,
    easing: "ease-out",
    fill: "forwards",
  };

  const pathAnim = path.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    timing,
  );

  void pathAnim.finished
    .then(() => finishReveal(path, glow, group))
    .catch(() => finishReveal(path, glow, group));
}
