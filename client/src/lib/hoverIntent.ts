/** Hover-intent timing — mirrors connectors-proto.html */
export const FIRE_COLD_MS = 40;
export const FIRE_WARM_MS = 40;
export const LEAVE_GRACE_MS = 50;
export const INFO_DELAY_MS = 300;
/** Re-exported for docs: hover → first pixel ≈ FIRE_COLD_MS + layout; full draw adds WIRE_REVEAL_MS. */
export { WIRE_REVEAL_MS, WIRE_REVEAL_STAGGER_MS } from "@/lib/wireReveal";
/** Wire hit-zone dwell before jump tooltip arms (keeps token clicks reachable). */
export const JUMP_TOOLTIP_DWELL_MS = 450;
export const JUMP_TOOLTIP_DWELL_WARM_MS = 280;

export type HoverIntentTimers = {
  fire: ReturnType<typeof setTimeout> | null;
  clear: ReturnType<typeof setTimeout> | null;
  info: ReturnType<typeof setTimeout> | null;
};

export function emptyHoverTimers(): HoverIntentTimers {
  return { fire: null, clear: null, info: null };
}

export function clearHoverTimers(timers: HoverIntentTimers): void {
  if (timers.fire) clearTimeout(timers.fire);
  if (timers.clear) clearTimeout(timers.clear);
  if (timers.info) clearTimeout(timers.info);
  timers.fire = null;
  timers.clear = null;
  timers.info = null;
}

export function fireDelayMs(
  isWarm: boolean,
  isCtrlHeld: boolean,
  instant = false,
): number {
  if (instant || isCtrlHeld) return 0;
  return isWarm ? FIRE_WARM_MS : FIRE_COLD_MS;
}

/** Grace only after a trace actually fired; pending dwell clears instantly. */
export function leaveGraceMs(traceHadFired: boolean): number {
  return traceHadFired ? LEAVE_GRACE_MS : 0;
}

/** Leave-clear runs when this token is still the latest pointer-leave target. */
export function shouldCommitHoverClear(
  tokenKey: string,
  hoverClearRef: { tokenKey: string } | null,
): boolean {
  return hoverClearRef?.tokenKey === tokenKey;
}
