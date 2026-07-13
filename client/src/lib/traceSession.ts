import { fireDelayMs, leaveGraceMs } from "@/lib/hoverIntent";
import type { PinMode, PinnedTrace } from "@/lib/pinnedTraces";
import type { PinSnapshot } from "@/lib/pinTraceHistory";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { TokenInfoState } from "@/lib/tokenContextInfo";

/**
 * Shared trace-session types, initial value, and pure selectors/delay helpers.
 * The state machine itself lives in `traceMachine.ts` (XState). This module holds
 * only the vocabulary (`TraceSession`/`TraceEvent`/`PaneMood`) and pure functions
 * that read a session snapshot — no reducer.
 */
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
