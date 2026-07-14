import { INFO_DELAY_MS } from "@/lib/hoverIntent";
import {
  clearTraceAnchorHost,
  lockTraceAnchorPreference,
  setTraceAnchorHost,
  unlockTraceAnchorPreference,
} from "@/lib/memberDefAnchor";
import { clearPendingTraceHost, setPendingTraceHost } from "@/lib/pendingTraceChip";
import type { PinMode, PinnedTrace } from "@/lib/pinnedTraces";
import { pinnedKeys } from "@/lib/pinnedTraces";
import { clearJumpTooltip } from "@/context/JumpTooltipContext";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
import {
  pointerEnterDelayMs,
  graceDelayMs,
  isStalePointerLeave,
  isTraceSessionActive,
  traceTokenKey,
  type PaneMood,
  type TraceEvent,
  type TraceSession,
} from "@/lib/traceSession";
import { snapshotToSession, traceMachine } from "@/lib/traceMachine";
import { useMachine } from "@xstate/react";
import { transition } from "xstate";
import {
  setHoverPreviewEdgeIds,
  setTraceSessionActive,
  setWireHoveredTokenKey,
} from "@/lib/wireHoverBoost";
import { WIRE_PROPAGATION_DRAIN_MS, wireCascadeDurationMs } from "@/lib/traceMotion";
import { depthFromHop } from "@/lib/traceDepth";
import {
  isWireSignalEmitting,
  keepWireSignalAlive,
  resetWireSignal,
  startWireSignalEpoch,
  stopWireSignalEmitting,
} from "@/lib/traceWireSignal";
import { armSourceArrival, clearWireArrivals } from "@/lib/wireSignalArrival";
import { notifyWireTransform } from "@/lib/wireEngine";
import { setTraceSessionMood } from "@/lib/traceSessionMood";
import { primeTraceSignal } from "@/lib/traceSignalPrime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

function traceHadCommitted(session: TraceSession): boolean {
  return session.committedKey != null || session.hoverPreviewEdges.length > 0;
}

type PendingFire = { tokenKey: string; onFire: () => void } | null;
type HoverClearTarget = { tokenKey: string; onClear: () => void } | null;

type SessionTimers = {
  fire: ReturnType<typeof setTimeout> | null;
  clear: ReturnType<typeof setTimeout> | null;
  info: ReturnType<typeof setTimeout> | null;
};

const emptyTimers = (): SessionTimers => ({ fire: null, clear: null, info: null });

function clearTimers(timers: SessionTimers): void {
  if (timers.fire) clearTimeout(timers.fire);
  if (timers.clear) clearTimeout(timers.clear);
  if (timers.info) clearTimeout(timers.info);
  timers.fire = null;
  timers.clear = null;
  timers.info = null;
}

const DEBUG_EVENT_LIMIT = 10;

function isTraceDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("trace-debug");
}

/** Single reducer-backed trace session — replaces scattered hover/pin/timer state. */
export function useTraceSession(isCtrlActive: boolean) {
  const [snapshot, actorSend] = useMachine(traceMachine);
  const session = useMemo<TraceSession>(
    () => snapshotToSession(snapshot.value as PaneMood, snapshot.context),
    [snapshot],
  );
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const timersRef = useRef<SessionTimers>(emptyTimers());
  const pendingFireRef = useRef<PendingFire>(null);
  const hoverClearRef = useRef<HoverClearTarget>(null);
  const hoveredTokenKeyRef = useRef<string | null>(null);
  const pinnedTracesRef = useRef(session.pinnedTraces);
  pinnedTracesRef.current = session.pinnedTraces;

  const [debugEvents, setDebugEvents] = useState<TraceEvent[]>([]);

  const logEvent = useCallback((event: TraceEvent) => {
    if (!isTraceDebugEnabled()) return;
    setDebugEvents((prev) => [...prev.slice(-(DEBUG_EVENT_LIMIT - 1)), event]);
  }, []);

  const send = useCallback(
    (event: TraceEvent) => {
      logEvent(event);
      actorSend(event);
    },
    [actorSend, logEvent],
  );

  hoveredTokenKeyRef.current = session.committedKey;

  const syncWireMirror = useCallback((next: TraceSession) => {
    const pointer = next.pointerKey ?? next.committedKey;
    setWireHoveredTokenKey(pointer);
    setTraceSessionActive(isTraceSessionActive(next));
    setHoverPreviewEdgeIds(
      pointer != null ? new Set(next.hoverPreviewEdges.map((e) => e.id)) : new Set(),
    );
  }, []);

  useLayoutEffect(() => {
    syncWireMirror(session);
    setTraceSessionMood(session.mood);
  }, [session, syncWireMirror]);

  useEffect(() => {
    send(isCtrlActive ? { type: "CTRL_DOWN" } : { type: "CTRL_UP" });
  }, [isCtrlActive, send]);

  const isPinnedTokenKey = useCallback(
    (tokenKey: string) => pinnedKeys(session.pinnedTraces).includes(tokenKey),
    [session.pinnedTraces],
  );

  const runFire = useCallback(
    (tokenKey: string, onFire: () => void, traceHost?: HTMLElement | null) => {
      clearPendingTraceHost();
      setTraceAnchorHost(traceHost ?? null);
      send({ type: "DWELL_FIRE", tokenKey });
      onFire();
      pendingFireRef.current = null;
      timersRef.current.fire = null;
    },
    [send],
  );

  const commitGraceClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      if (hoverClearRef.current?.tokenKey !== tokenKey) return;
      hoveredTokenKeyRef.current = null;
      pendingFireRef.current = null;
      hoverClearRef.current = null;
      clearPendingTraceHost();
      send({ type: "GRACE_EXPIRE", tokenKey });
      clearJumpTooltip();
      onClear();
    },
    [send],
  );

  const resetHoverIntent = useCallback(() => {
    clearTimers(timersRef.current);
    pendingFireRef.current = null;
    hoverClearRef.current = null;
    hoveredTokenKeyRef.current = null;
    clearPendingTraceHost();
    clearTraceAnchorHost();
    send({ type: "RESET" });
  }, [send]);

  const endTrace = useCallback(() => {
    clearTimers(timersRef.current);
    clearJumpTooltip();
    unlockTraceAnchorPreference();
    clearTraceAnchorHost();
    stopWireSignalEmitting();
    resetWireSignal();
    clearWireArrivals();
    send({ type: "RESET" });
  }, [send]);

  const beginTrace = useCallback(
    (tokenKey: string, edges: PreviewEdgeSpec[]) => {
      if (!isWireSignalEmitting()) {
        startWireSignalEpoch();
        armSourceArrival(tokenKey);
      }
      send({ type: "TRACE_COMMIT", tokenKey, edges });
      notifyWireTransform();
    },
    [send],
  );

  const emitWireSignal = useCallback(
    (tokenKey: string, edges: PreviewEdgeSpec[]) => {
      startWireSignalEpoch();
      armSourceArrival(tokenKey);
      send({ type: "WIRE_SIGNAL_START", tokenKey, edges });
      setWireHoveredTokenKey(tokenKey);
      setTraceSessionActive(true);
      setHoverPreviewEdgeIds(new Set(edges.map((edge) => edge.id)));
      primeTraceSignal({ tokenKey, edges });
      notifyWireTransform();
    },
    [send],
  );

  const scheduleHoverFire = useCallback(
    (
      tokenKey: string,
      onFire: () => void,
      onClear: () => void,
      onInfo?: () => void,
      options?: {
        instant?: boolean;
        traceHost?: HTMLElement | null;
        onSignal?: () => void;
      },
    ) => {
      const timers = timersRef.current;
      clearTimers(timers);
      clearTimeout(timers.clear ?? undefined);

      pendingFireRef.current = { tokenKey, onFire };
      hoverClearRef.current = { tokenKey, onClear };

      const prior = sessionRef.current;
      const switchingToken =
        prior.committedKey != null && prior.committedKey !== tokenKey;
      send({ type: "POINTER_ENTER", tokenKey, instant: options?.instant });
      setWireHoveredTokenKey(tokenKey);
      setTraceSessionActive(true);
      options?.onSignal?.();

      const delay = pointerEnterDelayMs(prior, tokenKey, options?.instant);
      setTraceSessionMood(delay === 0 ? "active" : "pending");
      if (delay === 0) {
        runFire(tokenKey, onFire, options?.traceHost ?? undefined);
      } else {
        if ((!prior.warm && !prior.committedKey) || switchingToken) {
          setPendingTraceHost(options?.traceHost ?? null);
        }
        timers.fire = setTimeout(
          () => runFire(tokenKey, onFire, options?.traceHost ?? undefined),
          delay,
        );
      }

      if (onInfo) {
        timers.info = setTimeout(() => {
          if (
            sessionRef.current.committedKey === tokenKey &&
            !isPinnedTokenKey(tokenKey)
          ) {
            onInfo();
          }
          timers.info = null;
        }, INFO_DELAY_MS);
      }
    },
    [isPinnedTokenKey, runFire, send],
  );

  const scheduleHoverClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      const prior = sessionRef.current;
      if (isStalePointerLeave(prior, tokenKey)) {
        return;
      }

      const timers = timersRef.current;
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.fire = null;
      timers.info = null;
      clearPendingTraceHost();

      hoverClearRef.current = { tokenKey, onClear };
      // Let the hop cascade finish even on a short hover: keep the signal alive
      // (so late-laid-out hops still draw) and size the drain to the cascade.
      const cascadeMs = wireCascadeDurationMs(
        prior.hoverPreviewEdges.reduce(
          (max, edge) => Math.max(max, depthFromHop(edge.hop)),
          1,
        ),
      );
      if (traceHadCommitted(prior)) keepWireSignalAlive(cascadeMs);
      stopWireSignalEmitting();
      send({ type: "POINTER_LEAVE", tokenKey });

      const [nextSnap] = transition(traceMachine, snapshotRef.current, {
        type: "POINTER_LEAVE",
        tokenKey,
      });
      const nextSession = snapshotToSession(nextSnap.value as PaneMood, nextSnap.context);
      const grace = graceDelayMs(nextSession);
      const drain =
        traceHadCommitted(prior) && nextSession.mood === "leaving"
          ? Math.max(WIRE_PROPAGATION_DRAIN_MS, cascadeMs)
          : 0;
      const waitMs = Math.max(grace, drain);

      if (waitMs === 0) {
        commitGraceClear(tokenKey, onClear);
        timers.clear = null;
        return;
      }

      timers.clear = setTimeout(() => {
        commitGraceClear(tokenKey, onClear);
        timers.clear = null;
      }, waitMs);
    },
    [commitGraceClear, send],
  );

  const cancelHoverLeaveGrace = useCallback(() => {
    clearTimeout(timersRef.current.clear ?? undefined);
    timersRef.current.clear = null;
    send({ type: "CANCEL_LEAVE_GRACE" });
  }, [send]);

  const scheduleHoverLeaveGrace = useCallback(() => {
    const clear = hoverClearRef.current;
    if (!clear) return;
    scheduleHoverClear(clear.tokenKey, clear.onClear);
  }, [scheduleHoverClear]);

  const endHoverPreview = useCallback(() => {
    if (pinnedTracesRef.current.length > 0) {
      hoveredTokenKeyRef.current = null;
      send({ type: "HOVER_END_PINNED" });
      send({ type: "CLEAR_UNPINNED_TOKEN_INFO" });
      return;
    }
    endTrace();
    send({ type: "CLEAR_UNPINNED_TOKEN_INFO" });
  }, [endTrace, send]);

  const pinTrace = useCallback(
    (tokenKey: string, shiftKey = false, traceHost?: HTMLElement | null) => {
      resetHoverIntent();
      if (traceHost) setTraceAnchorHost(traceHost);
      const mode: PinMode =
        shiftKey && pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey)
          ? "toggle"
          : shiftKey
            ? "accumulate"
            : "replace";
      send({ type: "PIN", tokenKey, mode });
      lockTraceAnchorPreference();
    },
    [resetHoverIntent, send],
  );

  const clearTokenInfo = useCallback(() => {
    send({ type: "UNPIN_ALL" });
    endTrace();
  }, [endTrace, send]);

  const goBackPin = useCallback(() => {
    resetHoverIntent();
    send({ type: "PIN_BACK" });
  }, [resetHoverIntent, send]);

  const showTokenInfo = useCallback(
    (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => {
      send({ type: "SHOW_TOKEN_INFO", info });
    },
    [send],
  );

  const setActivePinKey = useCallback(
    (tokenKey: string) => {
      send({ type: "SET_ACTIVE_PIN", tokenKey });
    },
    [send],
  );

  const updatePinnedTraceEdges = useCallback(
    (tokenKey: string, edges: PreviewEdgeSpec[]) => {
      send({ type: "TRACE_COMMIT", tokenKey, edges });
    },
    [send],
  );

  const clearUnpinnedTokenInfo = useCallback(() => {
    send({ type: "CLEAR_UNPINNED_TOKEN_INFO" });
  }, [send]);

  const clearAnchorTrace = useCallback(() => {
    send({ type: "CLEAR_ANCHOR" });
  }, [send]);

  const setHoverPreviewEdges = useCallback(
    (updater: (prev: PreviewEdgeSpec[]) => PreviewEdgeSpec[]) => {
      const next = updater(sessionRef.current.hoverPreviewEdges);
      send({ type: "REPLACE_HOVER_EDGES", edges: next });
    },
    [send],
  );

  const setPinnedTraces = useCallback(
    (updater: (prev: PinnedTrace[]) => PinnedTrace[]) => {
      const next = updater(sessionRef.current.pinnedTraces);
      pinnedTracesRef.current = next;
      send({ type: "REPLACE_PINNED_TRACES", traces: next });
    },
    [send],
  );

  const clearLastTraceRefs = useCallback(() => {
    // no-op — reducer owns lastTraceKey/edges
  }, []);

  const clearConnectionMenu = useCallback(() => {
    send({ type: "CLEAR_CONNECTION_MENU" });
  }, [send]);

  const showConnectionMenu = useCallback(
    (menu: TokenConnectionMenuState) => {
      send({ type: "SHOW_CONNECTION_MENU", menu });
    },
    [send],
  );

  useEffect(() => {
    if (!isCtrlActive) return;
    const timers = timersRef.current;
    if (!timers.fire) return;
    const pending = pendingFireRef.current;
    if (!pending) return;
    clearTimeout(timers.fire);
    timers.fire = null;
    clearPendingTraceHost();
    runFire(pending.tokenKey, pending.onFire);
  }, [isCtrlActive, runFire]);

  const completeFade = useCallback(() => {
    send({ type: "FADE_COMPLETE" });
  }, [send]);

  useEffect(() => () => clearTimers(timersRef.current), []);

  const pinnedTokenKeySet = useMemo(
    () => new Set(pinnedKeys(session.pinnedTraces)),
    [session.pinnedTraces],
  );

  return {
    hoverPreviewEdges: session.hoverPreviewEdges,
    anchorTrace: session.anchorTrace,
    pinnedTraces: session.pinnedTraces,
    pinnedTokenKeySet,
    activePinKey: session.activePinKey,
    hoveredTokenKey: session.pointerKey ?? session.committedKey,
    emphasisTokenKey: session.pointerKey,
    hoveredTokenKeyRef,
    pinnedTracesRef,
    isWarm: session.warm,
    tokenInfo: session.tokenInfo,
    connectionMenu: session.connectionMenu,
    traceTokenKey: traceTokenKey(session),
    isTraceActive: isTraceSessionActive(session),
    canGoBackPin: session.pinHistory.length > 0,
    sessionMood: session.mood,
    debugEvents,
    setHoverPreviewEdges,
    setPinnedTraces,
    beginTrace,
    emitWireSignal,
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
    setHoveredTokenKey: () => {},
    setIsWarm: () => {},
    clearAnchorTrace,
    clearLastTraceRefs,
    resetHoverIntent,
    updatePinnedTraceEdges,
    clearUnpinnedTokenInfo,
    completeFade,
  };
}
