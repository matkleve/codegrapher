import { useCallback, useEffect, useRef } from "react";
import {
  clearHoverTimers,
  emptyHoverTimers,
  fireDelayMs,
  INFO_DELAY_MS,
  LEAVE_GRACE_MS,
  shouldCommitHoverClear,
  type HoverIntentTimers,
} from "@/lib/hoverIntent";

type UseHoverIntentTimersArgs = {
  isCtrlActive: boolean;
  isWarm: boolean;
  hoveredTokenKey: string | null;
  isTokenPinned: (tokenKey: string) => boolean;
  setHoveredTokenKey: (tokenKey: string | null) => void;
  setIsWarm: (warm: boolean) => void;
  onCtrlRelease: () => void;
};

/**
 * Dwell/leave-grace/info-delay timers that gate when a hover trace actually
 * fires or clears (see `hoverIntent.ts` for the delay curve). Holding Ctrl
 * escalates a pending dwell timer to fire immediately. Kept separate from
 * `useTokenTraceState`'s pin bookkeeping — the only cross-cutting read is
 * `isTokenPinned`, passed in rather than reaching into pin state directly.
 */
export function useHoverIntentTimers({
  isCtrlActive,
  isWarm,
  hoveredTokenKey,
  isTokenPinned,
  setHoveredTokenKey,
  setIsWarm,
  onCtrlRelease,
}: UseHoverIntentTimersArgs) {
  const isCtrlActiveRef = useRef(isCtrlActive);
  isCtrlActiveRef.current = isCtrlActive;

  const hoverTimersRef = useRef<HoverIntentTimers>(emptyHoverTimers());
  const hoveredTokenKeyRef = useRef<string | null>(null);
  const pendingFireRef = useRef<{ tokenKey: string; onFire: () => void } | null>(
    null,
  );
  const hoverClearRef = useRef<{ tokenKey: string; onClear: () => void } | null>(
    null,
  );

  const resetHoverIntent = useCallback(() => {
    clearHoverTimers(hoverTimersRef.current);
    pendingFireRef.current = null;
    hoveredTokenKeyRef.current = null;
    hoverClearRef.current = null;
  }, []);

  const scheduleHoverFire = useCallback(
    (
      tokenKey: string,
      onFire: () => void,
      onClear: () => void,
      onInfo?: () => void,
      options?: { instant?: boolean },
    ) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.clear ?? undefined);
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.clear = null;
      timers.fire = null;
      timers.info = null;

      pendingFireRef.current = { tokenKey, onFire };
      hoverClearRef.current = { tokenKey, onClear };

      const runFire = () => {
        hoveredTokenKeyRef.current = tokenKey;
        setHoveredTokenKey(tokenKey);
        setIsWarm(true);
        onFire();
        pendingFireRef.current = null;
        timers.fire = null;
      };

      const delay = fireDelayMs(
        isWarm || hoveredTokenKey != null,
        isCtrlActiveRef.current,
        options?.instant,
      );
      if (delay === 0) {
        runFire();
      } else {
        timers.fire = setTimeout(runFire, delay);
      }

      if (onInfo) {
        timers.info = setTimeout(() => {
          if (
            hoveredTokenKeyRef.current === tokenKey &&
            !isTokenPinned(tokenKey)
          ) {
            onInfo();
          }
          timers.info = null;
        }, INFO_DELAY_MS);
      }
    },
    [hoveredTokenKey, isTokenPinned, isWarm, setHoveredTokenKey, setIsWarm],
  );

  const scheduleHoverClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.fire = null;
      timers.info = null;

      timers.clear = setTimeout(() => {
        if (!shouldCommitHoverClear(tokenKey, hoverClearRef.current)) {
          timers.clear = null;
          return;
        }
        clearTimeout(timers.fire ?? undefined);
        timers.fire = null;
        timers.info = null;
        hoveredTokenKeyRef.current = null;
        pendingFireRef.current = null;
        hoverClearRef.current = null;
        onClear();
        timers.clear = null;
      }, LEAVE_GRACE_MS);
    },
    [],
  );

  const cancelHoverLeaveGrace = useCallback(() => {
    clearTimeout(hoverTimersRef.current.clear ?? undefined);
    hoverTimersRef.current.clear = null;
  }, []);

  const scheduleHoverLeaveGrace = useCallback(() => {
    const clear = hoverClearRef.current;
    if (!clear) return;
    scheduleHoverClear(clear.tokenKey, clear.onClear);
  }, [scheduleHoverClear]);

  // Ctrl held while a dwell timer is pending fires it immediately (instant
  // hover under Ctrl); releasing Ctrl runs the caller's cleanup (closes menu).
  useEffect(() => {
    if (!isCtrlActive) {
      onCtrlRelease();
      return;
    }
    const timers = hoverTimersRef.current;
    if (!timers.fire) return;
    const pending = pendingFireRef.current;
    if (!pending) return;

    clearTimeout(timers.fire);
    timers.fire = null;
    hoveredTokenKeyRef.current = pending.tokenKey;
    pending.onFire();
    pendingFireRef.current = null;
  }, [isCtrlActive, onCtrlRelease]);

  return {
    hoveredTokenKeyRef,
    resetHoverIntent,
    scheduleHoverFire,
    scheduleHoverClear,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
  };
}
