import { useCallback } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import type { TokenInfoState } from "@/lib/tokenContextInfo";

type UseTokenHoverArgs = {
  tokenKey: string;
  enabled: boolean;
  onFire: () => void;
  onClear: () => void;
  buildTransientInfo?: () => Omit<TokenInfoState & object, "pinned">;
  traceHost?: () => HTMLElement | null;
};

/** Prototype scheduleFire / scheduleClear for one token host. */
export function useTokenHover({
  tokenKey,
  enabled,
  onFire,
  onClear,
  buildTransientInfo,
  traceHost,
}: UseTokenHoverArgs) {
  const { scheduleHoverFire, scheduleHoverClear, endHoverPreview, showTokenInfo } =
    useGraphInteraction();

  const clearHover = useCallback(() => {
    endHoverPreview();
    onClear();
  }, [endHoverPreview, onClear]);

  const onEnter = useCallback(() => {
    if (!enabled) return;
    const onInfo = buildTransientInfo
      ? () => showTokenInfo({ ...buildTransientInfo(), pinned: false })
      : undefined;
    scheduleHoverFire(tokenKey, onFire, clearHover, onInfo, {
      traceHost: traceHost?.() ?? undefined,
    });
  }, [
    buildTransientInfo,
    clearHover,
    enabled,
    onFire,
    scheduleHoverFire,
    showTokenInfo,
    tokenKey,
    traceHost,
  ]);

  const onLeave = useCallback(() => {
    if (!enabled) return;
    scheduleHoverClear(tokenKey, clearHover);
  }, [clearHover, enabled, scheduleHoverClear, tokenKey]);

  const onFocus = useCallback(() => {
    if (!enabled) return;
    const onInfo = buildTransientInfo
      ? () => showTokenInfo({ ...buildTransientInfo(), pinned: false })
      : undefined;
    scheduleHoverFire(tokenKey, onFire, clearHover, onInfo, {
      instant: true,
      traceHost: traceHost?.() ?? undefined,
    });
  }, [
    buildTransientInfo,
    clearHover,
    enabled,
    onFire,
    scheduleHoverFire,
    showTokenInfo,
    tokenKey,
    traceHost,
  ]);

  const onBlur = onLeave;

  return { onEnter, onLeave, onFocus, onBlur };
}

type UseTokenPinArgs = {
  tokenKey: string;
  enabled: boolean;
  onFire: () => void;
  buildPinInfo: () => Omit<TokenInfoState & object, "pinned">;
  animateEl?: HTMLElement | null;
};

/** Click pin — trace + context bar. */
export function commitTokenPin({
  pinTrace,
  showTokenInfo,
  tokenKey,
  onFire,
  buildPinInfo,
  animateEl,
  event,
  shiftKey = false,
}: {
  pinTrace: (tokenKey: string, shiftKey?: boolean, traceHost?: HTMLElement | null) => void;
  showTokenInfo: (
    info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean },
  ) => void;
  tokenKey: string;
  onFire: () => void;
  buildPinInfo: () => Omit<TokenInfoState & object, "pinned">;
  animateEl?: HTMLElement | null;
  event?: React.MouseEvent;
  shiftKey?: boolean;
}) {
  event?.stopPropagation();
  const el = animateEl ?? (event?.currentTarget as HTMLElement | undefined);
  pinTrace(tokenKey, shiftKey, el ?? null);
  onFire();
  showTokenInfo({ ...buildPinInfo(), pinned: true });
  el?.animate(
    [{ filter: "brightness(1.7)" }, { filter: "brightness(1)" }],
    { duration: 520, easing: "ease-out" },
  );
}

/** Click pin — trace + context bar. */
export function useTokenPin({
  tokenKey,
  enabled,
  onFire,
  buildPinInfo,
  animateEl,
}: UseTokenPinArgs) {
  const { pinTrace, showTokenInfo } = useGraphInteraction();

  const onPinClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      commitTokenPin({
        pinTrace,
        showTokenInfo,
        tokenKey,
        onFire,
        buildPinInfo,
        animateEl,
        event: e,
        shiftKey: e.shiftKey,
      });
    },
    [
      animateEl,
      buildPinInfo,
      enabled,
      onFire,
      pinTrace,
      showTokenInfo,
      tokenKey,
    ],
  );

  return { onPinClick };
}
