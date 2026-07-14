import { depthFromHop, previewHopFromDepth, traceStrength } from "@/lib/traceDepth";
import {
  WIRE_REVEAL_HOP_MS,
  WIRE_REVEAL_MS,
  WIRE_REVEAL_STAGGER_MS,
} from "@/lib/traceMotion";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  getWireArrival,
  getWireSignalEpoch,
  hasWireArrivals,
  isWireSignalEmitting,
} from "@/lib/trace/traceEngine";
import { traceKeyFromElement } from "@/lib/traceLitDepth";

// Arrival *state* (the map + arm/set/clear/subscribe) now lives in traceEngine.
export {
  subscribeWireArrival,
  clearWireArrivals,
  armSourceArrival,
  setWireEndpointArrival,
  hasWireArrivals,
} from "@/lib/trace/traceEngine";

function wireRevealDelayMs(hop: number | undefined, tieIndex = 0): number {
  const depth = depthFromHop(hop);
  return (depth - 1) * WIRE_REVEAL_HOP_MS + tieIndex * WIRE_REVEAL_STAGGER_MS;
}

export function traceKeyFromWireEnd(
  spec: PreviewEdgeSpec,
  end: "from" | "to",
): string | null {
  const hint = end === "to" ? spec.liveTo : spec.liveFrom;
  if (hint?.traceKey) return hint.traceKey;
  const ref = end === "to" ? spec.to : spec.from;
  if (ref?.type === "element") return traceKeyFromElement(ref.el);
  return null;
}

/** Depth-based wave when no per-wire slot exists yet. */
function scheduledProgressForDepth(depth: number): number {
  const epoch = getWireSignalEpoch();
  if (epoch === 0) return 1;
  const hop = previewHopFromDepth(depth);
  const offset = wireRevealDelayMs(hop, 0);
  const elapsed = performance.now() - epoch;
  if (elapsed < offset) return 0;
  const t = (elapsed - offset) / WIRE_REVEAL_MS;
  return Math.min(1, Math.max(0, t));
}

/**
 * Multiplier 0–1 for `--trace-strength` while the signal is propagating.
 * Returns null when the chip should use the normal focus/hover curve.
 */
export function getArrivalMultiplier(
  traceKey: string | null,
  depth: number,
): number | null {
  const slot = traceKey ? getWireArrival(traceKey) : undefined;
  if (slot) return slot.progress;

  if (!isWireSignalEmitting() && !hasWireArrivals()) return null;

  if (isWireSignalEmitting()) {
    return scheduledProgressForDepth(depth);
  }

  return hasWireArrivals() ? 1 : null;
}

export function resolveChipStrength(
  traceKey: string | null,
  depth: number,
  pointerHover: boolean,
): number {
  const situation = pointerHover ? "hover" : "focus";
  const base = traceStrength(situation, "chip", depth);
  if (pointerHover) return base;
  const arrival = getArrivalMultiplier(traceKey, depth);
  if (arrival == null) return base;
  return base * arrival;
}

export function wireEndpointDepth(spec: PreviewEdgeSpec): number {
  return depthFromHop(spec.hop);
}
