import { useCallback } from "react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import type { TokenInfoState } from "@/lib/tokenContextInfo";

type UseTokenHoverArgs = {
  tokenKey: string;
  enabled: boolean;
  onFire: () => void;
  onClear: () => void;
};

/** Prototype scheduleFire / scheduleClear for one token host. */
export function useTokenHover({
  tokenKey,
  enabled,
  onFire,
  onClear,
}: UseTokenHoverArgs) {
  const { scheduleHoverFire, scheduleHoverClear, pinnedTokenKey } =
    useGraphInteraction();

  const clearHover = useCallback(() => {
    if (pinnedTokenKey) return;
    onClear();
  }, [onClear, pinnedTokenKey]);

  const onEnter = useCallback(() => {
    if (!enabled) return;
    scheduleHoverFire(tokenKey, onFire, clearHover);
  }, [clearHover, enabled, onFire, scheduleHoverFire, tokenKey]);

  const onLeave = useCallback(() => {
    if (!enabled) return;
    scheduleHoverClear(tokenKey, clearHover);
  }, [clearHover, enabled, scheduleHoverClear, tokenKey]);

  return { onEnter, onLeave };
}

type UseTokenPinArgs = {
  tokenKey: string;
  enabled: boolean;
  onFire: () => void;
  buildPinInfo: () => Omit<TokenInfoState & object, "pinned">;
  animateEl?: HTMLElement | null;
};

/** Prototype Ctrl+click pin — trace + context bar. */
export function useTokenPin({
  tokenKey,
  enabled,
  onFire,
  buildPinInfo,
  animateEl,
}: UseTokenPinArgs) {
  const { isCtrlActive } = useCtrlKey();
  const { pinTrace, showTokenInfo } = useGraphInteraction();

  const onPinClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !isCtrlActive) return;
      e.stopPropagation();
      pinTrace(tokenKey);
      onFire();
      showTokenInfo({ ...buildPinInfo(), pinned: true });
      const el = animateEl ?? (e.currentTarget as HTMLElement);
      el.animate(
        [{ filter: "brightness(1.7)" }, { filter: "brightness(1)" }],
        { duration: 520, easing: "ease-out" },
      );
    },
    [
      animateEl,
      buildPinInfo,
      enabled,
      isCtrlActive,
      onFire,
      pinTrace,
      showTokenInfo,
      tokenKey,
    ],
  );

  return { onPinClick, isCtrlActive };
}
