import { assign, setup } from "xstate";
import { fireDelayMs } from "@/lib/hoverIntent";
import {
  applyPinGesture,
  pinnedKeys,
  updatePinnedEdges,
  updatePinnedInfo,
} from "@/lib/pinnedTraces";
import { popPinSnapshot, pushPinSnapshot } from "@/lib/pinTraceHistory";
import {
  INITIAL_TRACE_SESSION,
  type PaneMood,
  type TraceEvent,
  type TraceSession,
} from "@/lib/traceSession";

/**
 * Trace session as an XState statechart. The machine `value` is the pane mood
 * (`idle/pending/active/leaving`); everything else (pins, ctrl, edges, menu,
 * token info) lives in shared context. `snapshotToSession` rebuilds the exact
 * legacy `TraceSession` shape so existing selectors/helpers keep working.
 */
export type TraceContext = Omit<TraceSession, "mood">;

const { mood: _initialMood, ...INITIAL_CONTEXT } = INITIAL_TRACE_SESSION;
export { INITIAL_CONTEXT };

type EnterEvent = { tokenKey: string; instant?: boolean };

/** True when a POINTER_ENTER from `mood` commits with zero dwell (warm/ctrl/re-emphasis). */
function isInstantEnter(ctx: TraceContext, mood: PaneMood, ev: EnterEvent): boolean {
  const warmHandoff = ctx.warm || ctx.committedKey != null;
  const isReEmphasis =
    ctx.committedKey === ev.tokenKey && (mood === "active" || mood === "leaving");
  return fireDelayMs(warmHandoff, ctx.ctrlHeld, Boolean(ev.instant) || isReEmphasis) === 0;
}

function switchClears(ctx: TraceContext, tokenKey: string): Partial<TraceContext> {
  const switching = ctx.committedKey != null && ctx.committedKey !== tokenKey;
  return switching
    ? { committedKey: null, hoverPreviewEdges: [], anchorTrace: null, connectionMenu: null }
    : {};
}

const enterPending = assign(({ context, event }) => {
  const { tokenKey } = event as EnterEvent & { type: string };
  return {
    ...switchClears(context, tokenKey),
    pointerKey: tokenKey,
    leaveTargetKey: null,
    pendingTargetKey: tokenKey,
  };
});

const enterInstant = assign(({ context, event }) => {
  const { tokenKey } = event as EnterEvent & { type: string };
  return {
    ...switchClears(context, tokenKey),
    pointerKey: tokenKey,
    leaveTargetKey: null,
    pendingTargetKey: null,
    committedKey: tokenKey,
    warm: true,
  };
});

const commitDwell = assign(({ event }) => {
  const { tokenKey } = event as { tokenKey: string };
  return {
    pointerKey: tokenKey,
    committedKey: tokenKey,
    warm: true,
    pendingTargetKey: null,
    leaveTargetKey: null,
  };
});

const leaveBeforeCommit = assign({
  pointerKey: null,
  pendingTargetKey: null,
  leaveTargetKey: null,
});

const leaveWithPins = assign(({ event }) => {
  const { tokenKey } = event as { tokenKey: string };
  return {
    pointerKey: null,
    pendingTargetKey: null,
    committedKey: null,
    hoverPreviewEdges: [],
    connectionMenu: null,
    leaveTargetKey: tokenKey,
  };
});

const leaveToGrace = assign(({ event }) => {
  const { tokenKey } = event as { tokenKey: string };
  return {
    pointerKey: null,
    pendingTargetKey: null,
    leaveTargetKey: tokenKey,
  };
});

/** clearHoverTrace when no pins remain — stays in `leaving` for the DOM fade. */
const graceClearNoPins = assign({
  pointerKey: null,
  committedKey: null,
  hoverPreviewEdges: [],
  anchorTrace: null,
  connectionMenu: null,
  leaveTargetKey: null,
  pendingTargetKey: null,
  lastTraceKey: null,
  lastTraceEdges: [],
});

const graceClearWithPins = assign({
  pointerKey: null,
  committedKey: null,
  hoverPreviewEdges: [],
  connectionMenu: null,
  leaveTargetKey: null,
});

const commitHoverEdges = assign(({ event }) => {
  const { tokenKey, edges } = event as { tokenKey: string; edges: TraceContext["hoverPreviewEdges"] };
  return {
    committedKey: tokenKey,
    warm: true,
    hoverPreviewEdges: edges,
    anchorTrace: null,
    lastTraceKey: tokenKey,
    lastTraceEdges: edges,
    pendingTargetKey: null,
    leaveTargetKey: null,
  };
});

const commitPinnedEdges = assign(({ context, event }) => {
  const { tokenKey, edges } = event as { tokenKey: string; edges: TraceContext["hoverPreviewEdges"] };
  return {
    committedKey: tokenKey,
    warm: true,
    hoverPreviewEdges: [],
    pinnedTraces: updatePinnedEdges(context.pinnedTraces, tokenKey, edges),
  };
});

function snapshotPins(ctx: TraceContext): TraceContext["pinHistory"] {
  if (ctx.pinnedTraces.length === 0) return ctx.pinHistory;
  return pushPinSnapshot(ctx.pinHistory, {
    traces: ctx.pinnedTraces,
    activePinKey: ctx.activePinKey,
    tokenInfo: ctx.tokenInfo,
  });
}

const applyPin = assign(({ context, event }) => {
  const { tokenKey, mode } = event as { tokenKey: string; mode: "replace" | "accumulate" | "toggle" };
  const pinHistory = snapshotPins(context);
  const { traces, activeKey } = applyPinGesture(context.pinnedTraces, tokenKey, mode);
  if (!activeKey) {
    return { ...INITIAL_CONTEXT, pinHistory, ctrlHeld: context.ctrlHeld };
  }
  return {
    ...context,
    pinHistory,
    pinnedTraces: traces,
    activePinKey: activeKey,
    committedKey: activeKey,
    pointerKey: activeKey,
    warm: true,
    hoverPreviewEdges: [],
    anchorTrace: null,
    lastTraceKey: null,
    lastTraceEdges: [],
    leaveTargetKey: null,
    pendingTargetKey: null,
  };
});

const applyPinBack = assign(({ context }) => {
  const { history, snapshot } = popPinSnapshot(context.pinHistory);
  if (!snapshot) return context;
  const base = {
    ...context,
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
    return { ...base, committedKey: snapshot.activePinKey, pointerKey: snapshot.activePinKey, warm: true };
  }
  return {
    ...base,
    pointerKey: null,
    committedKey: null,
    warm: snapshot.traces.length > 0,
  };
});

const resetKeepCtrl = assign(({ context }) => ({
  ...INITIAL_CONTEXT,
  ctrlHeld: context.ctrlHeld,
}));

const unpinAll = assign(({ context }) => ({
  ...INITIAL_CONTEXT,
  pinHistory: snapshotPins(context),
  ctrlHeld: context.ctrlHeld,
}));

const hoverEndPinned = assign({
  committedKey: null,
  pointerKey: null,
  hoverPreviewEdges: [],
  connectionMenu: null,
});

const clearLeaveTarget = assign({ leaveTargetKey: null });

function hasPins(ctx: TraceContext): boolean {
  return ctx.pinnedTraces.length > 0;
}

function popActiveKey(ctx: TraceContext): string | null | undefined {
  const { snapshot } = popPinSnapshot(ctx.pinHistory);
  return snapshot ? snapshot.activePinKey : undefined;
}

function popTracesLen(ctx: TraceContext): number {
  const { snapshot } = popPinSnapshot(ctx.pinHistory);
  return snapshot ? snapshot.traces.length : 0;
}

export const traceMachine = setup({
  types: {
    context: {} as TraceContext,
    events: {} as TraceEvent,
  },
}).createMachine({
  id: "trace",
  initial: "idle",
  context: INITIAL_CONTEXT,
  on: {
    DWELL_FIRE: {
      guard: ({ context, event }) =>
        context.pendingTargetKey === event.tokenKey || context.pointerKey === event.tokenKey,
      target: ".active",
      actions: commitDwell,
    },
    TRACE_COMMIT: [
      {
        guard: ({ context, event }) => pinnedKeys(context.pinnedTraces).includes(event.tokenKey),
        actions: commitPinnedEdges,
      },
      { target: ".active", actions: commitHoverEdges },
    ],
    PIN: [
      {
        guard: ({ context, event }) =>
          applyPinGesture(context.pinnedTraces, event.tokenKey, event.mode).activeKey != null,
        target: ".active",
        actions: applyPin,
      },
      { target: ".idle", actions: applyPin },
    ],
    PIN_BACK: [
      { guard: ({ context }) => popActiveKey(context) === undefined },
      { guard: ({ context }) => popActiveKey(context) != null, target: ".active", actions: applyPinBack },
      { guard: ({ context }) => popTracesLen(context) > 0, target: ".active", actions: applyPinBack },
      { target: ".idle", actions: applyPinBack },
    ],
    UNPIN_ALL: { target: ".idle", actions: unpinAll },
    RESET: { target: ".idle", actions: resetKeepCtrl },
    SET_ACTIVE_PIN: {
      guard: ({ context, event }) => context.pinnedTraces.some((t) => t.tokenKey === event.tokenKey),
      actions: assign(({ context, event }) => {
        const pin = context.pinnedTraces.find((t) => t.tokenKey === event.tokenKey);
        return { activePinKey: event.tokenKey, tokenInfo: pin?.info ?? context.tokenInfo };
      }),
    },
    SHOW_TOKEN_INFO: {
      actions: assign(({ context, event }) => {
        const { pinned, ...info } = event.info;
        const pinnedTraces =
          pinned && context.activePinKey
            ? updatePinnedInfo(context.pinnedTraces, context.activePinKey, { ...info, pinned: true })
            : context.pinnedTraces;
        return { tokenInfo: event.info, pinnedTraces };
      }),
    },
    CLEAR_UNPINNED_TOKEN_INFO: {
      actions: assign(({ context }) => (context.tokenInfo?.pinned ? {} : { tokenInfo: null })),
    },
    CTRL_DOWN: { actions: assign({ ctrlHeld: true }) },
    CTRL_UP: { actions: assign({ ctrlHeld: false }) },
    CLEAR_ANCHOR: {
      actions: assign({ anchorTrace: null, lastTraceKey: null, lastTraceEdges: [] }),
    },
    HOVER_END_PINNED: [
      { guard: ({ context }) => hasPins(context), target: ".active", actions: hoverEndPinned },
      { target: ".idle", actions: hoverEndPinned },
    ],
    SHOW_CONNECTION_MENU: { actions: assign(({ event }) => ({ connectionMenu: event.menu })) },
    CLEAR_CONNECTION_MENU: {
      actions: assign(({ context }) => (context.connectionMenu ? { connectionMenu: null } : {})),
    },
    REPLACE_PINNED_TRACES: { actions: assign(({ event }) => ({ pinnedTraces: event.traces })) },
    REPLACE_HOVER_EDGES: { actions: assign(({ event }) => ({ hoverPreviewEdges: event.edges })) },
    WIRE_SIGNAL_START: {
      actions: assign(({ context, event }) => {
        const { tokenKey, edges } = event as { tokenKey: string; edges: TraceContext["hoverPreviewEdges"] };
        return {
          ...switchClears(context, tokenKey),
          pointerKey: tokenKey,
          pendingTargetKey: tokenKey,
          leaveTargetKey: null,
          hoverPreviewEdges: edges,
        };
      }),
    },
    CANCEL_LEAVE_GRACE: [
      { guard: ({ context }) => context.committedKey != null, target: ".active", actions: clearLeaveTarget },
      { actions: clearLeaveTarget },
    ],
  },
  states: {
    idle: {
      on: {
        POINTER_ENTER: [
          { guard: ({ context, event }) => isInstantEnter(context, "idle", event), target: "active", actions: enterInstant },
          { target: "pending", actions: enterPending },
        ],
      },
    },
    pending: {
      on: {
        POINTER_ENTER: [
          { guard: ({ context, event }) => isInstantEnter(context, "pending", event), target: "active", actions: enterInstant },
          { target: "pending", actions: enterPending },
        ],
        POINTER_LEAVE: [
          { guard: ({ context, event }) => isStale(context, "pending", event.tokenKey) },
          { target: "idle", actions: leaveBeforeCommit },
        ],
      },
    },
    active: {
      on: {
        POINTER_ENTER: [
          { guard: ({ context, event }) => isInstantEnter(context, "active", event), target: "active", actions: enterInstant },
          { target: "pending", actions: enterPending },
        ],
        POINTER_LEAVE: [
          { guard: ({ context, event }) => isStale(context, "active", event.tokenKey) },
          { guard: ({ context }) => context.committedKey == null, target: "idle", actions: leaveBeforeCommit },
          { guard: ({ context }) => hasPins(context), target: "active", actions: leaveWithPins },
          { target: "leaving", actions: leaveToGrace },
        ],
      },
    },
    leaving: {
      on: {
        POINTER_ENTER: [
          { guard: ({ context, event }) => isInstantEnter(context, "leaving", event), target: "active", actions: enterInstant },
          { target: "pending", actions: enterPending },
        ],
        POINTER_LEAVE: [
          { guard: ({ context, event }) => isStale(context, "leaving", event.tokenKey) },
          { guard: ({ context }) => context.committedKey == null, target: "idle", actions: leaveBeforeCommit },
          { guard: ({ context }) => hasPins(context), target: "active", actions: leaveWithPins },
          { target: "leaving", actions: leaveToGrace },
        ],
        GRACE_EXPIRE: [
          { guard: ({ context, event }) => context.leaveTargetKey !== event.tokenKey },
          { guard: ({ context }) => hasPins(context), target: "active", actions: graceClearWithPins },
          { target: "leaving", actions: graceClearNoPins },
        ],
        FADE_COMPLETE: { target: "idle" },
      },
    },
  },
});

/** Mirror of the reducer's isStalePointerLeave, using mood + context. */
function isStale(ctx: TraceContext, mood: PaneMood, tokenKey: string): boolean {
  if (ctx.pointerKey != null) return ctx.pointerKey !== tokenKey;
  if (ctx.pendingTargetKey != null) return ctx.pendingTargetKey !== tokenKey;
  if (mood === "leaving") return ctx.leaveTargetKey !== tokenKey;
  return ctx.committedKey != null && ctx.committedKey !== tokenKey;
}

export type TraceSnapshot = ReturnType<typeof traceMachine.getInitialSnapshot>;

/** Rebuild the legacy TraceSession shape so existing selectors/helpers keep working. */
export function snapshotToSession(value: PaneMood, context: TraceContext): TraceSession {
  return { mood: value, ...context };
}
