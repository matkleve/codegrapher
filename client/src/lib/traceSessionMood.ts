import type { PaneMood } from "@/lib/traceSession";

let sessionMood: PaneMood = "idle";
let domFading = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) notifyListener(listener);
}

function notifyListener(listener: () => void): void {
  listener();
}

/** Single writer for pane mood — synced from useTraceSession. */
export function setTraceSessionMood(mood: PaneMood): void {
  if (sessionMood === mood) return;
  sessionMood = mood;
  notify();
}

export function getTraceSessionMood(): PaneMood {
  return sessionMood;
}

/** DOM lit unwind in progress — overlaps leaving mood during fade animation. */
export function setTraceDomFading(fading: boolean): void {
  if (domFading === fading) return;
  domFading = fading;
  notify();
}

export function isTraceDomFading(): boolean {
  return domFading;
}

export function subscribeTraceSessionMood(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isTracePendingMood(): boolean {
  return sessionMood === "pending";
}

export function isTraceLeavingMood(): boolean {
  return sessionMood === "leaving" || domFading;
}
