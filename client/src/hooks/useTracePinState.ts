import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyPinGesture,
  mergePinnedEdges,
  pinnedKeys,
  updatePinnedEdges,
  updatePinnedInfo,
  type PinnedTrace,
} from "@/lib/pinnedTraces";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
import {
  lockTraceAnchorPreference,
  setTraceAnchorHost,
  unlockTraceAnchorPreference,
} from "@/lib/memberDefAnchor";
import {
  popPinSnapshot,
  pushPinSnapshot,
  type PinSnapshot,
} from "@/lib/pinTraceHistory";

export type TracePinDeps = {
  endTrace: () => void;
  resetHoverIntent: () => void;
  setHoveredTokenKey: (tokenKey: string | null) => void;
  setIsWarm: (warm: boolean) => void;
  clearAnchorTrace: () => void;
  clearLastTraceRefs: () => void;
};

export function useTracePinState(deps: TracePinDeps) {
  const {
    endTrace,
    resetHoverIntent,
    setHoveredTokenKey,
    setIsWarm,
    clearAnchorTrace,
    clearLastTraceRefs,
  } = deps;

  const [pinnedTraces, setPinnedTraces] = useState<PinnedTrace[]>([]);
  const [activePinKey, setActivePinKeyState] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoState>(null);
  const [pinHistoryLength, setPinHistoryLength] = useState(0);

  const pinnedTracesRef = useRef<PinnedTrace[]>([]);
  const activePinKeyRef = useRef<string | null>(null);
  const tokenInfoRef = useRef<TokenInfoState>(null);
  tokenInfoRef.current = tokenInfo;
  const pinHistoryRef = useRef<PinSnapshot[]>([]);

  const pushPinHistory = useCallback(() => {
    if (pinnedTracesRef.current.length === 0) return;
    pinHistoryRef.current = pushPinSnapshot(pinHistoryRef.current, {
      traces: pinnedTracesRef.current,
      activePinKey: activePinKeyRef.current,
      tokenInfo: tokenInfoRef.current,
    });
    setPinHistoryLength(pinHistoryRef.current.length);
  }, []);

  const isPinnedTokenKey = useCallback(
    (tokenKey: string) =>
      pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey),
    [],
  );

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
    const { history, snapshot } = popPinSnapshot(pinHistoryRef.current);
    pinHistoryRef.current = history;
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
  }, [endTrace, resetHoverIntent, setHoveredTokenKey, setIsWarm]);

  const pinTrace = useCallback(
    (tokenKey: string, shiftKey = false, traceHost?: HTMLElement | null) => {
      pushPinHistory();
      resetHoverIntent();
      clearAnchorTrace();
      clearLastTraceRefs();
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
    [
      clearAnchorTrace,
      clearLastTraceRefs,
      endTrace,
      pushPinHistory,
      resetHoverIntent,
      setHoveredTokenKey,
      setIsWarm,
    ],
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

  const updatePinnedTraceEdges = useCallback(
    (tokenKey: string, edges: Parameters<typeof updatePinnedEdges>[2]) => {
      const updated = updatePinnedEdges(pinnedTracesRef.current, tokenKey, edges);
      pinnedTracesRef.current = updated;
      setPinnedTraces(updated);
    },
    [],
  );

  const clearUnpinnedTokenInfo = useCallback(() => {
    if (!tokenInfoRef.current?.pinned) {
      setTokenInfo(null);
    }
  }, []);

  const pinnedPreviewEdges = useMemo(
    () => mergePinnedEdges(pinnedTraces),
    [pinnedTraces],
  );
  const pinnedTokenKeySet = useMemo(
    () => new Set(pinnedKeys(pinnedTraces)),
    [pinnedTraces],
  );
  const canGoBackPin = pinHistoryLength > 0;

  return {
    pinnedTraces,
    activePinKey,
    tokenInfo,
    pinnedTracesRef,
    activePinKeyRef,
    tokenInfoRef,
    pinnedPreviewEdges,
    pinnedTokenKeySet,
    canGoBackPin,
    setPinnedTraces,
    isPinnedTokenKey,
    clearTokenInfo,
    goBackPin,
    pinTrace,
    showTokenInfo,
    setActivePinKey,
    updatePinnedTraceEdges,
    clearUnpinnedTokenInfo,
  };
}
