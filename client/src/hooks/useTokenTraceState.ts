import { useCallback, useMemo, useRef, useState } from "react";
import { clearJumpTooltip } from "@/context/JumpTooltipContext";
import { useClearPinnedOnClickAway } from "@/hooks/useClearPinnedOnClickAway";
import { useHoverIntentTimers } from "@/hooks/useHoverIntentTimers";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import {
  applyPinGesture,
  mergePinnedEdges,
  pinnedKeys,
  updatePinnedEdges,
  updatePinnedInfo,
  type PinnedTrace,
} from "@/lib/pinnedTraces";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  clearTraceAnchorHost,
  lockTraceAnchorPreference,
  setTraceAnchorHost,
  traceAnchorState,
  unlockTraceAnchorPreference,
} from "@/lib/memberDefAnchor";

/** Caps memory use; deep back-tracking beyond this isn't a realistic use case. */
const PIN_HISTORY_LIMIT = 20;

type PinSnapshot = {
  traces: PinnedTrace[];
  activePinKey: string | null;
  tokenInfo: TokenInfoState;
};

/**
 * Owns the hover/pin trace state machine: ephemeral hover preview, pinned
 * traces + undo history, hover-intent timers (dwell/leave-grace/info delay),
 * and the connection menu + token-info panel that ride along with it.
 *
 * Hover and pin are intentionally one hook, not two — `beginTrace` reads and
 * writes pin state directly (a fired hover on an already-pinned token updates
 * that pin's edges instead of opening a parallel hover trace), so splitting
 * them would just relay the same refs back and forth between two files.
 */
type AnchorTrace = {
  tokenKey: string;
  edges: PreviewEdgeSpec[];
};

export function useTokenTraceState(isCtrlActive: boolean) {
  const [hoverPreviewEdges, setHoverPreviewEdges] = useState<PreviewEdgeSpec[]>([]);
  const [anchorTrace, setAnchorTrace] = useState<AnchorTrace | null>(null);
  const [pinnedTraces, setPinnedTraces] = useState<PinnedTrace[]>([]);
  const [activePinKey, setActivePinKeyState] = useState<string | null>(null);
  const [hoveredTokenKey, setHoveredTokenKey] = useState<string | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoState>(null);
  const [connectionMenu, setConnectionMenu] = useState<TokenConnectionMenuState | null>(
    null,
  );
  const [pinHistoryLength, setPinHistoryLength] = useState(0);

  const pinnedTracesRef = useRef<PinnedTrace[]>([]);
  const activePinKeyRef = useRef<string | null>(null);
  const tokenInfoRef = useRef<TokenInfoState>(null);
  tokenInfoRef.current = tokenInfo;
  const pinHistoryRef = useRef<PinSnapshot[]>([]);
  const hoverPreviewEdgesRef = useRef<PreviewEdgeSpec[]>([]);
  hoverPreviewEdgesRef.current = hoverPreviewEdges;
  const lastTraceKeyRef = useRef<string | null>(null);
  const lastTraceEdgesRef = useRef<PreviewEdgeSpec[]>([]);

  const clearConnectionMenu = useCallback(() => {
    setConnectionMenu(null);
  }, []);

  const showConnectionMenu = useCallback((state: TokenConnectionMenuState) => {
    setConnectionMenu(state);
  }, []);

  const endTrace = useCallback(() => {
    setHoverPreviewEdges([]);
    setAnchorTrace(null);
    lastTraceKeyRef.current = null;
    lastTraceEdgesRef.current = [];
    setHoveredTokenKey(null);
    setIsWarm(false);
    setConnectionMenu(null);
    clearTraceAnchorHost();
    unlockTraceAnchorPreference();
    clearJumpTooltip();
  }, []);

  const beginTrace = useCallback((tokenKey: string, edges: PreviewEdgeSpec[]) => {
    setHoveredTokenKey(tokenKey);
    setIsWarm(true);
    const pin = pinnedTracesRef.current.find((t) => t.tokenKey === tokenKey);
    if (pin) {
      const updated = updatePinnedEdges(pinnedTracesRef.current, tokenKey, edges);
      pinnedTracesRef.current = updated;
      setPinnedTraces(updated);
      setHoverPreviewEdges([]);
      return;
    }

    setAnchorTrace((anchor) => {
      const priorKey = lastTraceKeyRef.current;
      const priorEdges = lastTraceEdgesRef.current;
      if (
        priorKey &&
        priorKey !== tokenKey &&
        priorEdges.length > 0 &&
        !pinnedTracesRef.current.some((t) => t.tokenKey === priorKey)
      ) {
        return { tokenKey: priorKey, edges: priorEdges };
      }
      return null;
    });

    lastTraceKeyRef.current = tokenKey;
    lastTraceEdgesRef.current = edges;
    setHoverPreviewEdges(edges);
  }, []);

  const isPinnedTokenKey = useCallback(
    (tokenKey: string) =>
      pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey),
    [],
  );

  const beginHoverVisualLeave = useCallback(() => {
    if (pinnedTracesRef.current.length > 0) {
      setHoveredTokenKey(null);
      setHoverPreviewEdges([]);
      setConnectionMenu(null);
      return;
    }
    setHoveredTokenKey(null);
    setHoverPreviewEdges([]);
    setAnchorTrace(null);
    clearJumpTooltip();
  }, []);

  const {
    hoveredTokenKeyRef,
    resetHoverIntent,
    scheduleHoverFire,
    scheduleHoverClear,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
  } = useHoverIntentTimers({
    isCtrlActive,
    isWarm,
    hoveredTokenKey,
    isTokenPinned: isPinnedTokenKey,
    setHoveredTokenKey,
    setIsWarm,
    onCtrlRelease: clearConnectionMenu,
    onVisualLeave: beginHoverVisualLeave,
  });

  const endHoverPreview = useCallback(() => {
    if (pinnedTracesRef.current.length > 0) {
      hoveredTokenKeyRef.current = null;
      setHoveredTokenKey(null);
      setHoverPreviewEdges([]);
      setConnectionMenu(null);
      if (!tokenInfo?.pinned) setTokenInfo(null);
      return;
    }
    endTrace();
    if (!tokenInfo?.pinned) setTokenInfo(null);
  }, [endTrace, hoveredTokenKeyRef, tokenInfo?.pinned]);

  const pushPinHistory = useCallback(() => {
    if (pinnedTracesRef.current.length === 0) return;
    const history = pinHistoryRef.current;
    history.push({
      traces: pinnedTracesRef.current,
      activePinKey: activePinKeyRef.current,
      tokenInfo: tokenInfoRef.current,
    });
    if (history.length > PIN_HISTORY_LIMIT) history.shift();
    setPinHistoryLength(history.length);
  }, []);

  const clearTokenInfo = useCallback(() => {
    pushPinHistory();
    pinnedTracesRef.current = [];
    activePinKeyRef.current = null;
    setPinnedTraces([]);
    setActivePinKeyState(null);
    setTokenInfo(null);
    endTrace();
    unlockTraceAnchorPreference();
    resetHoverIntent();
  }, [endTrace, pushPinHistory, resetHoverIntent]);

  const goBackPin = useCallback(() => {
    const history = pinHistoryRef.current;
    const snapshot = history.pop();
    setPinHistoryLength(history.length);
    if (!snapshot) return;

    resetHoverIntent();
    pinnedTracesRef.current = snapshot.traces;
    activePinKeyRef.current = snapshot.activePinKey;
    setPinnedTraces(snapshot.traces);
    setActivePinKeyState(snapshot.activePinKey);
    setTokenInfo(snapshot.tokenInfo);
    if (snapshot.activePinKey) {
      lockTraceAnchorPreference();
      setHoveredTokenKey(snapshot.activePinKey);
      setIsWarm(true);
    } else {
      unlockTraceAnchorPreference();
      endTrace();
    }
  }, [endTrace, resetHoverIntent]);

  const pinTrace = useCallback(
    (tokenKey: string, shiftKey = false, traceHost?: HTMLElement | null) => {
      pushPinHistory();
      resetHoverIntent();
      setAnchorTrace(null);
      lastTraceKeyRef.current = null;
      lastTraceEdgesRef.current = [];
      if (traceHost) setTraceAnchorHost(traceHost);
      const mode = shiftKey
        ? pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey)
          ? "toggle"
          : "accumulate"
        : "replace";
      const { traces, activeKey } = applyPinGesture(
        pinnedTracesRef.current,
        tokenKey,
        mode,
      );
      pinnedTracesRef.current = traces;
      activePinKeyRef.current = activeKey;
      setPinnedTraces(traces);
      setActivePinKeyState(activeKey);
      if (activeKey) {
        lockTraceAnchorPreference();
        setHoveredTokenKey(activeKey);
        setIsWarm(true);
      } else {
        unlockTraceAnchorPreference();
        setTokenInfo(null);
        endTrace();
      }
    },
    [endTrace, pushPinHistory, resetHoverIntent],
  );

  const showTokenInfo = useCallback(
    (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => {
      setTokenInfo(info);
      if (info.pinned && activePinKeyRef.current) {
        const key = activePinKeyRef.current;
        const updated = updatePinnedInfo(
          pinnedTracesRef.current,
          key,
          { ...info, pinned: true },
        );
        pinnedTracesRef.current = updated;
        setPinnedTraces(updated);
      }
    },
    [],
  );

  const setActivePinKey = useCallback((tokenKey: string) => {
    if (!pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey)) return;
    activePinKeyRef.current = tokenKey;
    setActivePinKeyState(tokenKey);
    const pin = pinnedTracesRef.current.find((t) => t.tokenKey === tokenKey);
    if (pin?.info) {
      setTokenInfo(pin.info);
    }
  }, []);

  useClearPinnedOnClickAway(pinnedTraces.length > 0, clearTokenInfo);

  const pinnedPreviewEdges = useMemo(
    () => mergePinnedEdges(pinnedTraces),
    [pinnedTraces],
  );
  const pinnedTokenKeySet = useMemo(
    () => new Set(pinnedKeys(pinnedTraces)),
    [pinnedTraces],
  );
  const traceTokenKey =
    activePinKey ??
    hoveredTokenKey ??
    anchorTrace?.tokenKey ??
    pinnedTraces[0]?.tokenKey ??
    null;
  const isTraceActive =
    pinnedTraces.length > 0 || hoveredTokenKey != null || anchorTrace != null;
  const canGoBackPin = pinHistoryLength > 0;

  return useMemo(
    () => ({
      hoverPreviewEdges,
      anchorTrace,
      pinnedPreviewEdges,
      pinnedTraces,
      pinnedTokenKeySet,
      activePinKey,
      hoveredTokenKey,
      hoveredTokenKeyRef,
      traceAnchorState,
      pinnedTracesRef,
      isWarm,
      tokenInfo,
      connectionMenu,
      traceTokenKey,
      isTraceActive,
      canGoBackPin,
      setHoverPreviewEdges,
      setPinnedTraces,
      beginTrace,
      endTrace,
      endHoverPreview,
      pinTrace,
      goBackPin,
      clearTokenInfo,
      showTokenInfo,
      setActivePinKey,
      isPinnedTokenKey,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace,
      showConnectionMenu,
      clearConnectionMenu,
    }),
    [
      hoverPreviewEdges,
      anchorTrace,
      pinnedPreviewEdges,
      pinnedTraces,
      pinnedTokenKeySet,
      activePinKey,
      hoveredTokenKey,
      hoveredTokenKeyRef,
      traceAnchorState,
      isWarm,
      tokenInfo,
      connectionMenu,
      traceTokenKey,
      isTraceActive,
      canGoBackPin,
      beginTrace,
      endTrace,
      endHoverPreview,
      pinTrace,
      goBackPin,
      clearTokenInfo,
      showTokenInfo,
      setActivePinKey,
      isPinnedTokenKey,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace,
      showConnectionMenu,
      clearConnectionMenu,
    ],
  );
}
