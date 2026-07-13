/**
 * Wire signal emitter — propagation clock for preview edges.
 * Hover in: start epoch + emitting. Hover out: stop emitting; in-flight draws continue.
 */
let epochMs = 0;
let emitting = false;

export function startWireSignalEpoch(): number {
  epochMs = performance.now();
  emitting = true;
  return epochMs;
}

export function stopWireSignalEmitting(): void {
  emitting = false;
}

export function resetWireSignal(): void {
  emitting = false;
  epochMs = 0;
}

export function isWireSignalEmitting(): boolean {
  return emitting;
}

export function getWireSignalEpoch(): number {
  return epochMs;
}

/** Delay from signal start for a wire scheduled at `offsetMs` from core. */
export function wireSignalElapsedDelay(offsetMs: number): number {
  if (epochMs === 0) return offsetMs;
  return Math.max(0, offsetMs - (performance.now() - epochMs));
}
