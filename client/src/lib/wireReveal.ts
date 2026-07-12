import type { WireElements } from "@/lib/previewEdgeDom";

export const WIRE_REVEAL_MS = 80;
export const WIRE_REVEAL_STAGGER_MS = 20;

const activeReveals = new WeakMap<SVGPathElement, number>();

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function finishReveal(path: SVGPathElement, glow: SVGPathElement): void {
  path.style.removeProperty("stroke-dasharray");
  path.style.removeProperty("stroke-dashoffset");
  glow.style.removeProperty("opacity");
  activeReveals.delete(path);
}

/**
 * Stroke reveal from source → target. Skipped for warm wire retargets.
 * After reveal, inline dash overrides are removed so proto-flow CSS takes over.
 */
export function playWireReveal(
  wire: WireElements,
  warm: boolean,
  staggerIndex = 0,
): void {
  if (
    warm ||
    wire.group.dataset.revealed === "1" ||
    wire.group.dataset.revealStarted === "1"
  ) {
    return;
  }

  const path = wire.path;
  const glow = wire.glow;
  const d = path.getAttribute("d");
  if (!d) return;

  const len = path.getTotalLength();
  if (len <= 0) return;

  wire.group.dataset.revealStarted = "1";

  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  glow.style.opacity = "0";

  const delay = staggerIndex * WIRE_REVEAL_STAGGER_MS;
  const startAt = performance.now() + delay;

  const frame = (now: number): void => {
    if (now < startAt) {
      activeReveals.set(path, requestAnimationFrame(frame));
      return;
    }
    const t = Math.min(1, (now - startAt) / WIRE_REVEAL_MS);
    const eased = easeOutCubic(t);
    path.style.strokeDashoffset = `${len * (1 - eased)}`;
    glow.style.opacity = String(0.16 * eased);
    if (t < 1) {
      activeReveals.set(path, requestAnimationFrame(frame));
      return;
    }
    wire.group.dataset.revealed = "1";
    finishReveal(path, glow);
  };

  activeReveals.set(path, requestAnimationFrame(frame));
}
