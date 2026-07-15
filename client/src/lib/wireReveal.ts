import type { WireElements } from "@/lib/previewEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { depthFromHop } from "@/lib/traceDepth";
import { TRACE_STRENGTH_VAR } from "@/lib/traceLitApply";
import {
  WIRE_REVEAL_HOP_MS,
  WIRE_REVEAL_MS,
  WIRE_REVEAL_STAGGER_MS,
} from "@/lib/traceMotion";
import {
  isWireSignalEmitting,
  wireSignalElapsedDelay,
} from "@/lib/traceWireSignal";
import {
  setWireEndpointArrival,
  traceKeyFromWireEnd,
  wireEndpointDepth,
} from "@/lib/wireSignalArrival";
import { getWireHoveredTokenKey } from "@/lib/wireHoverBoost";
import { scheduleArrivalStrengthRefresh } from "@/lib/traceLitApplyDom";
import { markWireDrawStartOnce, markWireRevealedOnce } from "@/lib/traceTimeline";

export { WIRE_REVEAL_HOP_MS, WIRE_REVEAL_MS, WIRE_REVEAL_STAGGER_MS } from "@/lib/traceMotion";

const DRAWING = "preview-edge-drawing";
const GLOW_DRAWING = "preview-edge-glow-drawing";
export const MARCHING = "preview-edge-marching";

const activeDraws = new Map<SVGGElement, number>();
/** Cap per-frame progress so a long main-thread gap does not skip the stroke draw. */
const DRAW_FRAME_MS = 32;

export function hasActiveWireDraws(): boolean {
  return activeDraws.size > 0;
}

export function cancelWireDraw(group: SVGGElement): void {
  const raf = activeDraws.get(group);
  if (raf != null) {
    cancelAnimationFrame(raf);
    activeDraws.delete(group);
  }
}

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

function finishReveal(
  path: SVGPathElement,
  glow: SVGPathElement,
  group: SVGGElement,
  drawWallMs?: number,
): void {
  cancelWireDraw(group);
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
  markWireRevealedOnce(drawWallMs);
}

/** Drop reveal draw overrides — keeps CSS marching (`proto-flow`) running on path. */
export function stripWireRevealStroke(
  path: SVGPathElement,
  glow: SVGPathElement,
): void {
  const group = path.parentElement as SVGGElement | null;
  if (group) cancelWireDraw(group);
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

/**
 * One solid dash the length of the path. RAF offset reveals from the core end:
 * offset `len`→0 grows from the path start; `-len`→0 grows from the path end.
 */
function armPathStrokeDraw(path: SVGPathElement, len: number, reverse: boolean): void {
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${reverse ? -len : len}`;
}

function runStrokeDraw(
  wire: WireElements,
  len: number,
  delayMs: number,
  farKey: string | null,
  depth: number,
  reverse: boolean,
): void {
  const { path, glow, group } = wire;
  cancelWireDraw(group);

  const startAt = performance.now() + wireSignalElapsedDelay(delayMs);
  let elapsed = 0;
  let lastFrameAt = 0;
  let arrivalStep = -1;

  const tick = (now: number): void => {
    if (!isWireRevealing(group) && group.dataset.revealed !== "1") {
      cancelWireDraw(group);
      return;
    }

    if (now < startAt) {
      activeDraws.set(group, requestAnimationFrame(tick));
      return;
    }

    if (lastFrameAt === 0) lastFrameAt = now;
    const dt = Math.min(Math.max(0, now - lastFrameAt), DRAW_FRAME_MS);
    lastFrameAt = now;
    elapsed += dt;

    const progress = Math.min(1, elapsed / WIRE_REVEAL_MS);
    const remaining = len * (1 - progress);
    path.style.strokeDashoffset = `${reverse ? -remaining : remaining}`;
    if (farKey) {
      setWireEndpointArrival(farKey, depth, progress);
      const step = Math.floor(progress * 4);
      if (step !== arrivalStep || progress >= 1) {
        arrivalStep = step;
        scheduleArrivalStrengthRefresh();
      }
    }

    if (progress < 1) {
      activeDraws.set(group, requestAnimationFrame(tick));
      return;
    }

    activeDraws.delete(group);
    finishReveal(path, glow, group, elapsed);
  };

  activeDraws.set(group, requestAnimationFrame(tick));
}

/**
 * A wire always draws outward from the hovered "core" token. When the core is
 * the wire's `to` endpoint (e.g. hovering a usage whose edge was built
 * definition→usage), the reveal reverses so the stroke still emanates from the
 * core and the signal lights the far end on arrival.
 */
function resolveRevealDirection(spec: WireElements["spec"]): {
  reverse: boolean;
  farKey: string | null;
} {
  const coreKey = getWireHoveredTokenKey();
  const fromKey = traceKeyFromWireEnd(spec, "from");
  const toKey = traceKeyFromWireEnd(spec, "to");
  const reverse = coreKey != null && toKey === coreKey && fromKey !== coreKey;
  return { reverse, farKey: reverse ? fromKey : toKey };
}

/**
 * Stroke draw along path (thin line, source→target).
 * Glow stays hidden until draw completes, then marches dashed in sync.
 */
export function playWireReveal(wire: WireElements, delayMs = 0): void {
  const { path, glow, group, spec } = wire;
  if (group.dataset.revealStarted === "1" || group.dataset.revealed === "1") {
    return;
  }
  if (!isWireSignalEmitting()) {
    return;
  }

  const d = path.getAttribute("d");
  if (!d || /(?:NaN|Infinity)/.test(d)) return;

  const len = path.getTotalLength();
  if (!Number.isFinite(len) || len <= 0) return;

  group.dataset.revealStarted = "1";
  markWireDrawStartOnce();
  path.classList.add(DRAWING);
  glow.classList.add(GLOW_DRAWING);
  path.style.removeProperty("opacity");
  glow.style.removeProperty("stroke-dasharray");
  glow.style.removeProperty("stroke-dashoffset");
  glow.style.removeProperty(TRACE_STRENGTH_VAR);
  path.style.removeProperty(TRACE_STRENGTH_VAR);
  path.classList.remove("preview-edge-trace-strength");
  glow.classList.remove("preview-edge-trace-strength");

  const { reverse, farKey } = resolveRevealDirection(spec);
  const depth = wireEndpointDepth(spec);
  armPathStrokeDraw(path, len, reverse);
  glow.style.opacity = "0";
  path.style.opacity = "1";

  if (farKey) {
    setWireEndpointArrival(farKey, depth, 0);
  }

  runStrokeDraw(wire, len, delayMs, farKey, depth, reverse);
}
