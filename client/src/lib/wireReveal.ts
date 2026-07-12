import type { WireElements } from "@/lib/previewEdgeDom";
import { depthFromHop, traceStrength } from "@/lib/traceDepth";
import { TRACE_STRENGTH_VAR } from "@/lib/traceLitApply";

export const WIRE_REVEAL_MS = 240;
export const WIRE_REVEAL_STAGGER_MS = 25;

const DRAWING = "preview-edge-drawing";
const GLOW_DRAWING = "preview-edge-glow-drawing";
export const MARCHING = "preview-edge-marching";

export function isWireRevealing(group: SVGGElement): boolean {
  return group.dataset.revealStarted === "1" && group.dataset.revealed !== "1";
}

function finishReveal(path: SVGPathElement, glow: SVGPathElement, group: SVGGElement): void {
  path.getAnimations?.().forEach((a) => a.cancel());
  glow.getAnimations?.().forEach((a) => a.cancel());
  path.classList.remove(DRAWING);
  glow.classList.remove(GLOW_DRAWING);
  path.style.removeProperty("stroke-dasharray");
  path.style.removeProperty("stroke-dashoffset");
  glow.style.removeProperty("stroke-dasharray");
  glow.style.removeProperty("stroke-dashoffset");
  path.classList.add(MARCHING);
  group.dataset.revealed = "1";
  delete group.dataset.revealStarted;
}

function armStrokeReveal(
  el: SVGPathElement,
  len: number,
): void {
  el.style.strokeDasharray = `${len}`;
  el.style.strokeDashoffset = `${len}`;
}

/**
 * Stroke reveal from path start → end (definition → usage).
 * Path and glow share the same dash draw — glow opacity does not lead the stroke.
 */
export function playWireReveal(wire: WireElements, staggerIndex = 0): void {
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
  glow.style.removeProperty("opacity");
  path.style.setProperty(TRACE_STRENGTH_VAR, String(pathStrength));
  glow.style.setProperty(TRACE_STRENGTH_VAR, String(glowStrength));
  armStrokeReveal(path, len);
  armStrokeReveal(glow, len);

  const delay = staggerIndex * WIRE_REVEAL_STAGGER_MS;
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
  const glowAnim = glow.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    timing,
  );

  void Promise.all([pathAnim.finished, glowAnim.finished])
    .then(() => finishReveal(path, glow, group))
    .catch(() => finishReveal(path, glow, group));
}
