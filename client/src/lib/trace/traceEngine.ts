/* eslint-disable max-lines -- single owner of trace runtime state; see docs/project/trace-engine-consolidation-plan.md */
import type { PaneMood } from "@/lib/traceSession";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { markTracePhase } from "@/lib/traceTimeline";

/**
 * TraceEngine — the single source of truth for the hover/trace **runtime**
 * state. Consolidates what used to be scattered across `traceWireSignal`,
 * `wireHoverBoost`, `wireSignalArrival` and `traceSessionMood` (each with its
 * own module globals + pub/sub). Those modules now re-export from here, so there
 * is exactly one copy of each piece of state and no hand-synced mirrors to drift.
 *
 * The xstate machine (via `useTraceSession`) is the writer; the DOM-paint layer
 * (`traceLitApply*`, `wireReveal`) and React read it. Notification stays split
 * into the original granular channels (strength / arrival / mood) so imperative
 * subscribers are not over-notified.
 *
 * See docs/project/trace-engine-consolidation-plan.md and
 * docs/specs/system/token-hover.atlas.supplement.md § render isolation.
 */

export type ArrivalSlot = { progress: number; depth: number };

type TraceEngineState = {
  // signal clock (propagation)
  epochMs: number;
  emitting: boolean;
  keepAliveUntilMs: number;
  // pointer / emphasis
  hoveredTokenKey: string | null;
  hoveredWireEdgeId: string | null;
  traceSessionActive: boolean;
  hoverPreviewEdgeIds: ReadonlySet<string>;
  // per-endpoint propagation progress
  arrivals: Map<string, ArrivalSlot>;
  // pane mood
  sessionMood: PaneMood;
  domFading: boolean;
};

const state: TraceEngineState = {
  epochMs: 0,
  emitting: false,
  keepAliveUntilMs: 0,
  hoveredTokenKey: null,
  hoveredWireEdgeId: null,
  traceSessionActive: false,
  hoverPreviewEdgeIds: new Set(),
  arrivals: new Map(),
  sessionMood: "idle",
  domFading: false,
};

// ── Granular notify channels (preserve original subscriber granularity) ──────
const strengthListeners = new Set<() => void>();
const arrivalListeners = new Set<() => void>();
const moodListeners = new Set<() => void>();

function fire(listeners: Set<() => void>): void {
  for (const listener of listeners) listener();
}

export function subscribeTraceStrength(listener: () => void): () => void {
  strengthListeners.add(listener);
  return () => strengthListeners.delete(listener);
}
export function subscribeWireArrival(listener: () => void): () => void {
  arrivalListeners.add(listener);
  return () => arrivalListeners.delete(listener);
}
export function subscribeTraceSessionMood(listener: () => void): () => void {
  moodListeners.add(listener);
  return () => moodListeners.delete(listener);
}

// ── Signal clock ─────────────────────────────────────────────────────────────
export function startWireSignalEpoch(): number {
  state.epochMs = performance.now();
  state.emitting = true;
  state.keepAliveUntilMs = 0;
  return state.epochMs;
}
export function stopWireSignalEmitting(): void {
  state.emitting = false;
}
/** Keep the signal "emitting" for `durationMs` after the pointer leaves so the
 *  hop cascade completes on a short hover (see `wireCascadeDurationMs`). */
export function keepWireSignalAlive(durationMs: number): void {
  state.keepAliveUntilMs = performance.now() + durationMs;
}
export function resetWireSignal(): void {
  state.emitting = false;
  state.epochMs = 0;
  state.keepAliveUntilMs = 0;
}
export function isWireSignalEmitting(): boolean {
  return state.emitting || performance.now() < state.keepAliveUntilMs;
}
export function getWireSignalEpoch(): number {
  return state.epochMs;
}
/** Delay from signal start for a wire scheduled at `offsetMs` from core. */
export function wireSignalElapsedDelay(offsetMs: number): number {
  if (state.epochMs === 0) return offsetMs;
  return Math.max(0, offsetMs - (performance.now() - state.epochMs));
}

// ── Pointer / emphasis (strength channel) ────────────────────────────────────
export function setWireHoveredTokenKey(key: string | null): void {
  state.hoveredTokenKey = key;
}
export function getWireHoveredTokenKey(): string | null {
  return state.hoveredTokenKey;
}
export function setHoverPreviewEdgeIds(ids: ReadonlySet<string>): void {
  if (
    ids.size === state.hoverPreviewEdgeIds.size &&
    [...ids].every((id) => state.hoverPreviewEdgeIds.has(id))
  ) {
    return;
  }
  state.hoverPreviewEdgeIds = ids;
  fire(strengthListeners);
}
export function isHoverPreviewEdge(id: string): boolean {
  return state.hoverPreviewEdgeIds.has(id);
}
export function setTraceSessionActive(active: boolean): void {
  if (state.traceSessionActive === active) return;
  state.traceSessionActive = active;
  fire(strengthListeners);
}
export function isTraceSessionActive(): boolean {
  return state.traceSessionActive;
}
export function setWireHoveredEdgeId(id: string | null): void {
  if (state.hoveredWireEdgeId === id) return;
  state.hoveredWireEdgeId = id;
  fire(strengthListeners);
}
export function getWireHoveredEdgeId(): string | null {
  return state.hoveredWireEdgeId;
}

// ── Arrivals (arrival channel) ───────────────────────────────────────────────
export function clearWireArrivals(): void {
  if (state.arrivals.size === 0) return;
  state.arrivals.clear();
  fire(arrivalListeners);
}
/** Source token is live the instant the emitter arms. */
export function armSourceArrival(traceKey: string): void {
  state.arrivals.set(traceKey, { progress: 1, depth: 1 });
  fire(arrivalListeners);
}
export function setWireEndpointArrival(
  traceKey: string,
  depth: number,
  progress: number,
): void {
  const clamped = Math.min(1, Math.max(0, progress));
  const prev = state.arrivals.get(traceKey);
  if (prev && prev.progress >= clamped && clamped < 1) return;
  state.arrivals.set(traceKey, { progress: clamped, depth });
}
export function getWireArrival(traceKey: string): ArrivalSlot | undefined {
  return state.arrivals.get(traceKey);
}
export function hasWireArrivals(): boolean {
  return state.arrivals.size > 0;
}

// ── Pane mood (mood channel) ─────────────────────────────────────────────────
export function setTraceSessionMood(mood: PaneMood): void {
  if (state.sessionMood === mood) return;
  state.sessionMood = mood;
  fire(moodListeners);
}
export function getTraceSessionMood(): PaneMood {
  return state.sessionMood;
}
export function setTraceDomFading(fading: boolean): void {
  if (state.domFading === fading) return;
  state.domFading = fading;
  fire(moodListeners);
}
export function isTraceDomFading(): boolean {
  return state.domFading;
}
export function isTracePendingMood(): boolean {
  return state.sessionMood === "pending";
}
export function isTraceLeavingMood(): boolean {
  return state.sessionMood === "leaving" || state.domFading;
}

// ── One-shot prime event (imperative kick on hover; carries no state) ─────────
export type TraceSignalPrimeArgs = { tokenKey: string; edges: PreviewEdgeSpec[] };
const primeListeners = new Set<(args: TraceSignalPrimeArgs) => void>();
export function subscribeTraceSignalPrime(
  listener: (args: TraceSignalPrimeArgs) => void,
): () => void {
  primeListeners.add(listener);
  return () => primeListeners.delete(listener);
}
export function primeTraceSignal(args: TraceSignalPrimeArgs): void {
  markTracePhase("wirePrime", `${args.edges.length} edges`);
  for (const listener of primeListeners) listener(args);
}
