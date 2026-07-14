/**
 * Wire signal emitter — propagation clock for preview edges.
 * Hover in: start epoch + emitting. Hover out: stop emitting; in-flight draws continue.
 */
let epochMs = 0;
let emitting = false;
/** After the pointer leaves, reveals may still START until this time so the
 *  hop cascade finishes on a short hover (see `keepWireSignalAlive`). */
let keepAliveUntilMs = 0;

export function startWireSignalEpoch(): number {
  epochMs = performance.now();
  emitting = true;
  keepAliveUntilMs = 0;
  return epochMs;
}

export function stopWireSignalEmitting(): void {
  emitting = false;
}

/**
 * Keep the signal "emitting" for `durationMs` more even though the pointer left,
 * so hop-2/3 wires that get laid out after leave still draw. Sized by
 * `wireCascadeDurationMs` at the call site.
 */
export function keepWireSignalAlive(durationMs: number): void {
  keepAliveUntilMs = performance.now() + durationMs;
}

export function resetWireSignal(): void {
  emitting = false;
  epochMs = 0;
  keepAliveUntilMs = 0;
}

export function isWireSignalEmitting(): boolean {
  return emitting || performance.now() < keepAliveUntilMs;
}

export function getWireSignalEpoch(): number {
  return epochMs;
}

/** Delay from signal start for a wire scheduled at `offsetMs` from core. */
export function wireSignalElapsedDelay(offsetMs: number): number {
  if (epochMs === 0) return offsetMs;
  return Math.max(0, offsetMs - (performance.now() - epochMs));
}
