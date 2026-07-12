import type { PlaybackSpeed } from "@/lib/staticWalk/types";

/**
 * Fixed per-substep duration (see canvas-values supplement, "Synchronized
 * arrival"): every point in a substep departs and arrives together,
 * regardless of path length, so duration is fixed and speed is derived —
 * never the other way around. Play speed scales this duration directly.
 */
export const SUBSTEP_MS = 260;

export function substepIntervalMs(playbackSpeed: PlaybackSpeed): number {
  return SUBSTEP_MS / playbackSpeed;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
