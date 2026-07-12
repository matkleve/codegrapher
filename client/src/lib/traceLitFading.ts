let fading = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Pane class while lit DOM unwinds — dim off, lit CSS still scoped. */
export function setTraceLitFading(next: boolean): void {
  if (fading === next) return;
  fading = next;
  notify();
}

export function isTraceLitFading(): boolean {
  return fading;
}

export function subscribeTraceLitFading(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
