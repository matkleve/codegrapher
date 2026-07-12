import { useMemo, useRef } from "react";
import { useClearPinnedOnClickAway } from "@/hooks/useClearPinnedOnClickAway";
import { useTraceHoverState } from "@/hooks/useTraceHoverState";
import { useTracePinState } from "@/hooks/useTracePinState";
import { traceAnchorState } from "@/lib/memberDefAnchor";

/**
 * Composes hover and pin trace state. Hover and pin share refs so
 * `beginTrace` can update an already-pinned token's edges in place.
 */
export function useTokenTraceState(isCtrlActive: boolean) {
  const hoverEndRef = useRef<() => void>(() => {});
  const resetHoverRef = useRef<() => void>(() => {});
  const setHoveredRef = useRef<(key: string | null) => void>(() => {});
  const setWarmRef = useRef<(warm: boolean) => void>(() => {});
  const clearAnchorRef = useRef<() => void>(() => {});
  const clearLastRefsRef = useRef<() => void>(() => {});

  const pin = useTracePinState({
    endTrace: () => hoverEndRef.current(),
    resetHoverIntent: () => resetHoverRef.current(),
    setHoveredTokenKey: (key) => setHoveredRef.current(key),
    setIsWarm: (warm) => setWarmRef.current(warm),
    clearAnchorTrace: () => clearAnchorRef.current(),
    clearLastTraceRefs: () => clearLastRefsRef.current(),
  });

  const hover = useTraceHoverState(isCtrlActive, {
    pinnedTracesRef: pin.pinnedTracesRef,
    isPinnedTokenKey: pin.isPinnedTokenKey,
    updatePinnedTraceEdges: pin.updatePinnedTraceEdges,
    clearUnpinnedTokenInfo: pin.clearUnpinnedTokenInfo,
  });

  hoverEndRef.current = hover.endTrace;
  resetHoverRef.current = hover.resetHoverIntent;
  setHoveredRef.current = hover.setHoveredTokenKey;
  setWarmRef.current = hover.setIsWarm;
  clearAnchorRef.current = hover.clearAnchorTrace;
  clearLastRefsRef.current = hover.clearLastTraceRefs;

  useClearPinnedOnClickAway(pin.pinnedTraces.length > 0, pin.clearTokenInfo);

  const traceTokenKey =
    pin.activePinKey ??
    hover.hoveredTokenKey ??
    hover.anchorTrace?.tokenKey ??
    pin.pinnedTraces[0]?.tokenKey ??
    null;
  const isTraceActive =
    pin.pinnedTraces.length > 0 ||
    hover.hoveredTokenKey != null ||
    hover.anchorTrace != null;

  return useMemo(
    () => ({
      hoverPreviewEdges: hover.hoverPreviewEdges,
      anchorTrace: hover.anchorTrace,
      pinnedPreviewEdges: pin.pinnedPreviewEdges,
      pinnedTraces: pin.pinnedTraces,
      pinnedTokenKeySet: pin.pinnedTokenKeySet,
      activePinKey: pin.activePinKey,
      hoveredTokenKey: hover.hoveredTokenKey,
      hoveredTokenKeyRef: hover.hoveredTokenKeyRef,
      traceAnchorState,
      pinnedTracesRef: pin.pinnedTracesRef,
      isWarm: hover.isWarm,
      tokenInfo: pin.tokenInfo,
      connectionMenu: hover.connectionMenu,
      traceTokenKey,
      isTraceActive,
      canGoBackPin: pin.canGoBackPin,
      setHoverPreviewEdges: hover.setHoverPreviewEdges,
      setPinnedTraces: pin.setPinnedTraces,
      beginTrace: hover.beginTrace,
      endTrace: hover.endTrace,
      endHoverPreview: hover.endHoverPreview,
      pinTrace: pin.pinTrace,
      goBackPin: pin.goBackPin,
      clearTokenInfo: pin.clearTokenInfo,
      showTokenInfo: pin.showTokenInfo,
      setActivePinKey: pin.setActivePinKey,
      isPinnedTokenKey: pin.isPinnedTokenKey,
      scheduleHoverFire: hover.scheduleHoverFire,
      scheduleHoverClear: hover.scheduleHoverClear,
      scheduleHoverLeaveGrace: hover.scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace: hover.cancelHoverLeaveGrace,
      showConnectionMenu: hover.showConnectionMenu,
      clearConnectionMenu: hover.clearConnectionMenu,
    }),
    [hover, pin, isTraceActive, traceTokenKey],
  );
}
