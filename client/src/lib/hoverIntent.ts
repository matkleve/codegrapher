/** Hover-intent timing — driven by `traceMotion.ts` orchestration. */
import {
  FIRE_COLD_MS,
  FIRE_WARM_MS,
  INFO_DELAY_MS,
  TRACE_MOTION,
  WIRE_REVEAL_MS,
  WIRE_REVEAL_STAGGER_MS,
} from "@/lib/traceMotion";

export {
  FIRE_COLD_MS,
  FIRE_WARM_MS,
  INFO_DELAY_MS,
  TRACE_MOTION,
  WIRE_REVEAL_MS,
  WIRE_REVEAL_STAGGER_MS,
};

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
  if (instant || isCtrlHeld || isWarm) return 0;
  return FIRE_COLD_MS;
}

/** Leave clears immediately — visual fade is owned by `--motion-trace-out`. */
export function leaveGraceMs(_traceHadFired: boolean, _isWarm = false): number {
  return 0;
}

/** Leave-clear runs when this token is still the latest pointer-leave target. */
export function shouldCommitHoverClear(
  tokenKey: string,
  hoverClearRef: { tokenKey: string } | null,
): boolean {
  return hoverClearRef?.tokenKey === tokenKey;
}
