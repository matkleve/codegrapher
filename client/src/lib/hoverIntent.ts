/** Hover-intent timing — mirrors connectors-proto.html (no info popover timer). */
export const FIRE_COLD_MS = 150;
export const FIRE_WARM_MS = 80;
export const LEAVE_GRACE_MS = 150;

export type HoverIntentTimers = {
  fire: ReturnType<typeof setTimeout> | null;
  clear: ReturnType<typeof setTimeout> | null;
};

export function emptyHoverTimers(): HoverIntentTimers {
  return { fire: null, clear: null };
}

export function clearHoverTimers(timers: HoverIntentTimers): void {
  if (timers.fire) clearTimeout(timers.fire);
  if (timers.clear) clearTimeout(timers.clear);
  timers.fire = null;
  timers.clear = null;
}

export function fireDelayMs(isWarm: boolean, isCtrlHeld: boolean): number {
  if (isCtrlHeld) return 0;
  return isWarm ? FIRE_WARM_MS : FIRE_COLD_MS;
}
