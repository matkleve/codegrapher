import { useCallback, useEffect, useRef } from "react";
import {
  emptyHoverTimers,
  type HoverIntentTimers,
} from "@/lib/hoverIntent";
import {
  firePendingCtrlHover,
  resetHoverIntentState,
  scheduleHoverClearIntent,
  scheduleHoverFireIntent,
  type HoverClearContext,
  type HoverClearTarget,
  type HoverFireContext,
  type PendingFire,
} from "@/lib/hoverIntentTimers";

type UseHoverIntentTimersArgs = {
  isCtrlActive: boolean;
  isWarm: boolean;
  hoveredTokenKey: string | null;
  isTokenPinned: (tokenKey: string) => boolean;
  setHoveredTokenKey: (tokenKey: string | null) => void;
  setIsWarm: (warm: boolean) => void;
  onCtrlRelease: () => void;
  /** Drop trace visuals immediately on leave; grace only defers host cleanup. */
  onVisualLeave: () => void;
};

/**
 * Dwell/leave-grace/info-delay timers that gate when a hover trace actually
 * fires or clears (see `hoverIntent.ts` for the delay curve). Holding Ctrl
 * escalates a pending dwell timer to fire immediately.
 */
export function useHoverIntentTimers({
  isCtrlActive,
  isWarm,
  hoveredTokenKey,
  isTokenPinned,
  setHoveredTokenKey,
  setIsWarm,
  onCtrlRelease,
  onVisualLeave,
}: UseHoverIntentTimersArgs) {
  const isCtrlActiveRef = useRef(isCtrlActive);
  isCtrlActiveRef.current = isCtrlActive;

  const hoverTimersRef = useRef<HoverIntentTimers>(emptyHoverTimers());
  const hoveredTokenKeyRef = useRef<string | null>(null);
  const pendingFireRef = useRef<PendingFire>(null);
  const hoverClearRef = useRef<HoverClearTarget>(null);

  const fireContext = (): HoverFireContext => ({
    timers: hoverTimersRef.current,
    pendingFireRef,
    hoverClearRef,
    hoveredTokenKeyRef,
    isWarm,
    hoveredTokenKey,
    isCtrlActive: isCtrlActiveRef.current,
    isTokenPinned,
    setHoveredTokenKey,
    setIsWarm,
  });

  const clearContext = (): HoverClearContext => ({
    timers: hoverTimersRef.current,
    pendingFireRef,
    hoverClearRef,
    hoveredTokenKeyRef,
    onVisualLeave,
  });

  const resetHoverIntent = useCallback(() => {
    resetHoverIntentState(
      hoverTimersRef.current,
      pendingFireRef,
      hoveredTokenKeyRef,
      hoverClearRef,
    );
  }, []);

  const scheduleHoverFire = useCallback(
    (
      tokenKey: string,
      onFire: () => void,
      onClear: () => void,
      onInfo?: () => void,
      options?: { instant?: boolean; traceHost?: HTMLElement | null },
    ) => {
      scheduleHoverFireIntent(fireContext(), tokenKey, onFire, onClear, onInfo, options);
    },
    [hoveredTokenKey, isTokenPinned, isWarm, setHoveredTokenKey, setIsWarm],
  );

  const scheduleHoverClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      scheduleHoverClearIntent(clearContext(), tokenKey, onClear);
    },
    [onVisualLeave],
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

  useEffect(() => {
    if (!isCtrlActive) {
      onCtrlRelease();
      return;
    }
    firePendingCtrlHover(
      hoverTimersRef.current,
      pendingFireRef,
      hoveredTokenKeyRef,
    );
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
