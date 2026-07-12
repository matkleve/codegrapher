import { fireDelayMs, leaveGraceMs } from "@/lib/hoverIntent";
import {
  applyPinGesture,
  pinnedKeys,
  updatePinnedEdges,
  updatePinnedInfo,
  type PinMode,
  type PinnedTrace,
} from "@/lib/pinnedTraces";
import {
  popPinSnapshot,
  pushPinSnapshot,
  type PinSnapshot,
} from "@/lib/pinTraceHistory";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { TokenInfoState } from "@/lib/tokenContextInfo";

export type PaneMood = "idle" | "pending" | "active" | "leaving";

export type AnchorTrace = {
  tokenKey: string;
  edges: PreviewEdgeSpec[];
};

export type TraceSession = {
  mood: PaneMood;
  /** Immediate pointer target (was emphasisTokenKey). */
  pointerKey: string | null;
  /** Committed dwell trace (was hoveredTokenKey). */
  committedKey: string | null;
  warm: boolean;
  ctrlHeld: boolean;
  pinnedTraces: PinnedTrace[];
  activePinKey: string | null;
  pinHistory: PinSnapshot[];
  tokenInfo: TokenInfoState;
  hoverPreviewEdges: PreviewEdgeSpec[];
  anchorTrace: AnchorTrace | null;
  /** Hover/context "load a definition" dropdown — closes whenever hover trace ends. */
  connectionMenu: TokenConnectionMenuState | null;
  /** Last pointer-leave token — grace only commits when this still matches. */
  leaveTargetKey: string | null;
  /** Dwell target while mood is pending. */
  pendingTargetKey: string | null;
  /** Prior trace key/edges for anchor handoff across token switches. */
  lastTraceKey: string | null;
  lastTraceEdges: PreviewEdgeSpec[];
};

export type TraceEvent =
  | { type: "POINTER_ENTER"; tokenKey: string; instant?: boolean }
  | { type: "POINTER_LEAVE"; tokenKey: string }
  | { type: "DWELL_FIRE"; tokenKey: string }
  | { type: "GRACE_EXPIRE"; tokenKey: string }
  | { type: "TRACE_COMMIT"; tokenKey: string; edges: PreviewEdgeSpec[] }
  | { type: "PIN"; tokenKey: string; mode: PinMode }
  | { type: "PIN_BACK" }
  | { type: "UNPIN_ALL" }
  | { type: "SET_ACTIVE_PIN"; tokenKey: string }
  | { type: "SHOW_TOKEN_INFO"; info: NonNullable<TokenInfoState> & { pinned: boolean } }
  | { type: "CLEAR_UNPINNED_TOKEN_INFO" }
  | { type: "CTRL_DOWN" }
  | { type: "CTRL_UP" }
  | { type: "CANCEL_LEAVE_GRACE" }
  | { type: "CLEAR_ANCHOR" }
  | { type: "HOVER_END_PINNED" }
  | { type: "SHOW_CONNECTION_MENU"; menu: TokenConnectionMenuState }
  | { type: "CLEAR_CONNECTION_MENU" }
  | { type: "REPLACE_PINNED_TRACES"; traces: PinnedTrace[] }
  | { type: "REPLACE_HOVER_EDGES"; edges: PreviewEdgeSpec[] }
  | { type: "FADE_COMPLETE" }
  | { type: "RESET" };

export const INITIAL_TRACE_SESSION: TraceSession = {
  mood: "idle",
  pointerKey: null,
  committedKey: null,
  warm: false,
  ctrlHeld: false,
  pinnedTraces: [],
  activePinKey: null,
  pinHistory: [],
  tokenInfo: null,
  hoverPreviewEdges: [],
  anchorTrace: null,
  connectionMenu: null,
  leaveTargetKey: null,
  pendingTargetKey: null,
  lastTraceKey: null,
  lastTraceEdges: [],
};

function isPinned(session: TraceSession, tokenKey: string): boolean {
  return pinnedKeys(session.pinnedTraces).includes(tokenKey);
}

function hasPinnedTraces(session: TraceSession): boolean {
  return session.pinnedTraces.length > 0;
}

function traceHadFired(session: TraceSession): boolean {
  return session.committedKey != null;
}

/** Ignore leave events from tokens the pointer already left (fast A→B handoff). */
export function isStalePointerLeave(
  session: TraceSession,
  tokenKey: string,
): boolean {
  if (session.pointerKey != null) {
    return session.pointerKey !== tokenKey;
  }
  if (session.pendingTargetKey != null) {
    return session.pendingTargetKey !== tokenKey;
  }
  if (session.mood === "leaving") {
    return session.leaveTargetKey !== tokenKey;
  }
  return session.committedKey != null && session.committedKey !== tokenKey;
}

function clearHoverTrace(session: TraceSession, keepLeaving = false): TraceSession {
  const nextMood = hasPinnedTraces(session)
    ? "active"
    : keepLeaving
      ? "leaving"
      : "idle";
  return {
    ...session,
    mood: nextMood,
    pointerKey: null,
    committedKey: null,
    warm: hasPinnedTraces(session),
    hoverPreviewEdges: [],
    anchorTrace: null,
    connectionMenu: null,
    leaveTargetKey: null,
    pendingTargetKey: null,
    lastTraceKey: null,
    lastTraceEdges: [],
  };
}

function dropPointerEmphasis(session: TraceSession): TraceSession {
  return {
    ...session,
    pointerKey: null,
    pendingTargetKey: null,
    mood: session.committedKey != null ? "active" : session.mood,
  };
}

function onPointerEnter(
  session: TraceSession,
  tokenKey: string,
  instant = false,
): TraceSession {
  const delay = pointerEnterDelayMs(session, tokenKey, instant);
  const switchingToken =
    session.committedKey != null && session.committedKey !== tokenKey;

  let next: TraceSession = {
    ...session,
    pointerKey: tokenKey,
    leaveTargetKey: null,
    pendingTargetKey: delay > 0 ? tokenKey : null,
    mood: delay > 0 ? "pending" : "active",
    ...(switchingToken
      ? {
          committedKey: null,
          hoverPreviewEdges: [],
          anchorTrace: null,
          connectionMenu: null,
        }
      : {}),
  };

  if (delay === 0) {
    next = {
      ...next,
      committedKey: tokenKey,
      warm: true,
      pendingTargetKey: null,
    };
  }

  return next;
}

function onPointerLeave(session: TraceSession, tokenKey: string): TraceSession {
  if (isStalePointerLeave(session, tokenKey)) {
    return session;
  }

  if (!traceHadFired(session)) {
    return {
      ...session,
      mood: "idle",
      pointerKey: null,
      pendingTargetKey: null,
      leaveTargetKey: null,
    };
  }

  if (hasPinnedTraces(session)) {
    return {
      ...dropPointerEmphasis(session),
      committedKey: null,
      hoverPreviewEdges: [],
      connectionMenu: null,
      leaveTargetKey: tokenKey,
      mood: "active",
    };
  }

  const grace = leaveGraceMs(true, session.warm);
  if (grace === 0) {
    return clearHoverTrace(
      {
        ...session,
        leaveTargetKey: tokenKey,
      },
      true,
    );
  }

  return {
    ...session,
    pointerKey: null,
    pendingTargetKey: null,
    mood: "leaving",
    leaveTargetKey: tokenKey,
  };
}

function onDwellFire(session: TraceSession, tokenKey: string): TraceSession {
  if (session.pendingTargetKey !== tokenKey && session.pointerKey !== tokenKey) {
    return session;
  }
  return {
    ...session,
    mood: "active",
    pointerKey: tokenKey,
    committedKey: tokenKey,
    warm: true,
    pendingTargetKey: null,
    leaveTargetKey: null,
  };
}

function onGraceExpire(session: TraceSession, tokenKey: string): TraceSession {
  if (session.leaveTargetKey !== tokenKey) return session;
  if (session.pendingTargetKey != null) return session;
  if (session.mood !== "leaving") return session;

  if (hasPinnedTraces(session)) {
    return {
      ...session,
      mood: "active",
      pointerKey: null,
      committedKey: null,
      hoverPreviewEdges: [],
      connectionMenu: null,
      leaveTargetKey: null,
    };
  }

  return clearHoverTrace(session, true);
}

function onTraceCommit(
  session: TraceSession,
  tokenKey: string,
  edges: PreviewEdgeSpec[],
): TraceSession {
  if (isPinned(session, tokenKey)) {
    return {
      ...session,
      committedKey: tokenKey,
      warm: true,
      hoverPreviewEdges: [],
      pinnedTraces: updatePinnedEdges(session.pinnedTraces, tokenKey, edges),
    };
  }

  return {
    ...session,
    committedKey: tokenKey,
    warm: true,
    mood: "active",
    hoverPreviewEdges: edges,
    anchorTrace: null,
    lastTraceKey: tokenKey,
    lastTraceEdges: edges,
    pendingTargetKey: null,
    leaveTargetKey: null,
  };
}

function snapshotPins(session: TraceSession): PinSnapshot[] {
  if (session.pinnedTraces.length === 0) return session.pinHistory;
  return pushPinSnapshot(session.pinHistory, {
    traces: session.pinnedTraces,
    activePinKey: session.activePinKey,
    tokenInfo: session.tokenInfo,
  });
}

function onPin(
  session: TraceSession,
  tokenKey: string,
  mode: PinMode,
): TraceSession {
  const pinHistory = snapshotPins(session);
  const { traces, activeKey } = applyPinGesture(session.pinnedTraces, tokenKey, mode);

  if (!activeKey) {
    return {
      ...INITIAL_TRACE_SESSION,
      pinHistory,
      ctrlHeld: session.ctrlHeld,
    };
  }

  return {
    ...session,
    pinHistory,
    pinnedTraces: traces,
    activePinKey: activeKey,
    committedKey: activeKey,
    pointerKey: activeKey,
    warm: true,
    mood: "active",
    hoverPreviewEdges: [],
    anchorTrace: null,
    lastTraceKey: null,
    lastTraceEdges: [],
    leaveTargetKey: null,
    pendingTargetKey: null,
  };
}

function onPinBack(session: TraceSession): TraceSession {
  const { history, snapshot } = popPinSnapshot(session.pinHistory);
  if (!snapshot) return session;

  const next: TraceSession = {
    ...session,
    pinHistory: history,
    pinnedTraces: snapshot.traces,
    activePinKey: snapshot.activePinKey,
    tokenInfo: snapshot.tokenInfo,
    hoverPreviewEdges: [],
    anchorTrace: null,
    lastTraceKey: null,
    lastTraceEdges: [],
    leaveTargetKey: null,
    pendingTargetKey: null,
  };

  if (snapshot.activePinKey) {
    return {
      ...next,
      committedKey: snapshot.activePinKey,
      pointerKey: snapshot.activePinKey,
      warm: true,
      mood: "active",
    };
  }

  return clearHoverTrace(next);
}

function onUnpinAll(session: TraceSession): TraceSession {
  const pinHistory = snapshotPins(session);
  return {
    ...INITIAL_TRACE_SESSION,
    pinHistory,
    ctrlHeld: session.ctrlHeld,
  };
}

export function traceSessionReducer(
  state: TraceSession,
  event: TraceEvent,
): TraceSession {
  switch (event.type) {
    case "POINTER_ENTER":
      return onPointerEnter(state, event.tokenKey, event.instant);
    case "POINTER_LEAVE":
      return onPointerLeave(state, event.tokenKey);
    case "DWELL_FIRE":
      return onDwellFire(state, event.tokenKey);
    case "GRACE_EXPIRE":
      return onGraceExpire(state, event.tokenKey);
    case "TRACE_COMMIT":
      return onTraceCommit(state, event.tokenKey, event.edges);
    case "PIN":
      return onPin(state, event.tokenKey, event.mode);
    case "PIN_BACK":
      return onPinBack(state);
    case "UNPIN_ALL":
      return onUnpinAll(state);
    case "SET_ACTIVE_PIN": {
      if (!state.pinnedTraces.some((t) => t.tokenKey === event.tokenKey)) {
        return state;
      }
      const pin = state.pinnedTraces.find((t) => t.tokenKey === event.tokenKey);
      return {
        ...state,
        activePinKey: event.tokenKey,
        tokenInfo: pin?.info ?? state.tokenInfo,
      };
    }
    case "SHOW_TOKEN_INFO": {
      const { pinned, ...info } = event.info;
      let pinnedTraces = state.pinnedTraces;
      if (pinned && state.activePinKey) {
        pinnedTraces = updatePinnedInfo(pinnedTraces, state.activePinKey, {
          ...info,
          pinned: true,
        });
      }
      return { ...state, tokenInfo: event.info, pinnedTraces };
    }
    case "CLEAR_UNPINNED_TOKEN_INFO":
      return state.tokenInfo?.pinned ? state : { ...state, tokenInfo: null };
    case "CTRL_DOWN":
      return { ...state, ctrlHeld: true };
    case "CTRL_UP":
      return { ...state, ctrlHeld: false };
    case "CANCEL_LEAVE_GRACE":
      return { ...state, leaveTargetKey: null, mood: state.committedKey ? "active" : state.mood };
    case "CLEAR_ANCHOR":
      return {
        ...state,
        anchorTrace: null,
        lastTraceKey: null,
        lastTraceEdges: [],
      };
    case "HOVER_END_PINNED":
      return {
        ...state,
        committedKey: null,
        pointerKey: null,
        hoverPreviewEdges: [],
        connectionMenu: null,
        mood: hasPinnedTraces(state) ? "active" : "idle",
      };
    case "SHOW_CONNECTION_MENU":
      return { ...state, connectionMenu: event.menu };
    case "CLEAR_CONNECTION_MENU":
      return state.connectionMenu ? { ...state, connectionMenu: null } : state;
    case "REPLACE_PINNED_TRACES":
      return { ...state, pinnedTraces: event.traces };
    case "REPLACE_HOVER_EDGES":
      return { ...state, hoverPreviewEdges: event.edges };
    case "FADE_COMPLETE":
      return state.mood === "leaving"
        ? { ...state, mood: "idle" }
        : state;
    case "RESET":
      return { ...INITIAL_TRACE_SESSION, ctrlHeld: state.ctrlHeld };
    default:
      return state;
  }
}

/** Batch events in one reducer pass (leave-then-enter same tick). */
export function reduceTraceSession(
  state: TraceSession,
  events: TraceEvent[],
): TraceSession {
  return events.reduce(traceSessionReducer, state);
}

export function traceTokenKey(session: TraceSession): string | null {
  return (
    session.pointerKey ??
    session.committedKey ??
    session.activePinKey ??
    session.anchorTrace?.tokenKey ??
    session.pinnedTraces[0]?.tokenKey ??
    null
  );
}

export function isTraceSessionActive(session: TraceSession): boolean {
  return (
    session.pinnedTraces.length > 0 ||
    session.pointerKey != null ||
    session.committedKey != null ||
    session.anchorTrace != null ||
    session.mood === "leaving"
  );
}

export function isTracePendingMood(session: TraceSession): boolean {
  return session.mood === "pending";
}

export function isTraceLeavingMood(session: TraceSession): boolean {
  return session.mood === "leaving";
}

export function pointerEnterDelayMs(
  session: TraceSession,
  tokenKey: string,
  instant = false,
): number {
  const warmHandoff = session.warm || session.committedKey != null;
  const isReEmphasis =
    session.committedKey === tokenKey &&
    (session.mood === "active" || session.mood === "leaving");
  return fireDelayMs(warmHandoff, session.ctrlHeld, instant || isReEmphasis);
}

export function dwellDelayMs(session: TraceSession, instant = false): number {
  const warmHandoff = session.warm || session.committedKey != null;
  return fireDelayMs(warmHandoff, session.ctrlHeld, instant);
}

export function graceDelayMs(session: TraceSession): number {
  return leaveGraceMs(traceHadFired(session), session.warm);
}
