import {
  isTraceLeavingMood,
  setTraceDomFading,
  subscribeTraceSessionMood,
} from "@/lib/traceSessionMood";

/** Pane class while lit DOM unwinds — dim off, lit CSS still scoped. */
export function setTraceLitFading(next: boolean): void {
  setTraceDomFading(next);
}

export function isTraceLitFading(): boolean {
  return isTraceLeavingMood();
}

export function subscribeTraceLitFading(listener: () => void): () => void {
  return subscribeTraceSessionMood(listener);
}
