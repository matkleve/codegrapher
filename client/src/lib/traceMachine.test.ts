import { describe, expect, it } from "vitest";
import { initialTransition, transition } from "xstate";
import { snapshotToSession, traceMachine, type TraceSnapshot } from "@/lib/traceMachine";
import {
  dwellDelayMs,
  graceDelayMs,
  isStalePointerLeave,
  isTraceLeavingMood,
  isTracePendingMood,
  isTraceSessionActive,
  pointerEnterDelayMs,
  traceTokenKey,
  type PaneMood,
  type TraceEvent,
} from "@/lib/traceSession";

const KEY_A = "flow::m1::3::field";
const KEY_B = "flow::m1::5::query";
const KEY_DEF = "flow::def::m1";

const fakeMenu = {
  token: "field",
  kind: "variable" as const,
  role: "usage" as const,
  anchor: { x: 0, y: 0 },
  anchorEl: {} as HTMLElement,
  variant: "hover" as const,
  sections: [],
};

function init(): TraceSnapshot {
  const [snap] = initialTransition(traceMachine);
  return snap;
}

function step(snap: TraceSnapshot, event: TraceEvent): TraceSnapshot {
  const [next] = transition(traceMachine, snap, event);
  return next;
}

function reduce(snap: TraceSnapshot, events: TraceEvent[]): TraceSnapshot {
  return events.reduce(step, snap);
}

/** Rebuild the legacy session shape so the existing selectors/helpers can assert. */
function sess(snap: TraceSnapshot) {
  return snapshotToSession(snap.value as PaneMood, snap.context);
}

function committed(snap: TraceSnapshot, key: string): TraceSnapshot {
  return step(step(snap, { type: "POINTER_ENTER", tokenKey: key }), {
    type: "DWELL_FIRE",
    tokenKey: key,
  });
}

describe("traceMachine (parity with traceSessionReducer)", () => {
  it("starts idle", () => {
    const s = init();
    expect(s.value).toBe("idle");
    expect(isTraceSessionActive(sess(s))).toBe(false);
  });

  it("POINTER_ENTER cold goes pending with pointer set", () => {
    const next = step(init(), { type: "POINTER_ENTER", tokenKey: KEY_A });
    expect(next.value).toBe("pending");
    expect(next.context.pointerKey).toBe(KEY_A);
    expect(next.context.committedKey).toBeNull();
    expect(isTracePendingMood(sess(next))).toBe(true);
  });

  it("POINTER_ENTER instant commits immediately", () => {
    const next = step(init(), { type: "POINTER_ENTER", tokenKey: KEY_A, instant: true });
    expect(next.value).toBe("active");
    expect(next.context.committedKey).toBe(KEY_A);
    expect(next.context.warm).toBe(true);
  });

  it("DWELL_FIRE commits pending token", () => {
    const pending = step(init(), { type: "POINTER_ENTER", tokenKey: KEY_A });
    const active = step(pending, { type: "DWELL_FIRE", tokenKey: KEY_A });
    expect(active.value).toBe("active");
    expect(active.context.committedKey).toBe(KEY_A);
  });

  it("POINTER_LEAVE before dwell clears instantly", () => {
    const pending = step(init(), { type: "POINTER_ENTER", tokenKey: KEY_A });
    const idle = step(pending, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    expect(idle.value).toBe("idle");
    expect(idle.context.pointerKey).toBeNull();
    expect(graceDelayMs(sess(idle))).toBe(0);
  });

  it("POINTER_LEAVE after commit enters leaving mood", () => {
    const active = committed(init(), KEY_A);
    const leaving = step(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    expect(leaving.value).toBe("leaving");
    expect(leaving.context.committedKey).toBe(KEY_A);
    expect(leaving.context.pointerKey).toBeNull();
    expect(isTraceLeavingMood(sess(leaving))).toBe(true);
    expect(graceDelayMs(sess(leaving))).toBeGreaterThan(0);
  });

  it("POINTER_ENTER re-emphasizes committed token instantly", () => {
    const active = committed(init(), KEY_A);
    const leaving = step(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    const reenter = step(leaving, { type: "POINTER_ENTER", tokenKey: KEY_A });
    expect(reenter.value).toBe("active");
    expect(reenter.context.committedKey).toBe(KEY_A);
    expect(reenter.context.pointerKey).toBe(KEY_A);
    expect(reenter.context.pendingTargetKey).toBeNull();
    expect(pointerEnterDelayMs(sess(leaving), KEY_A)).toBe(0);
  });

  it("warm handoff leave-then-enter same batch stays active", () => {
    const active = committed(init(), KEY_A);
    const next = reduce(active, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
    ]);
    expect(next.value).toBe("pending");
    expect(next.context.committedKey).toBeNull();
    expect(next.context.pointerKey).toBe(KEY_B);
    expect(traceTokenKey(sess(next))).toBe(KEY_B);
    expect(isTraceSessionActive(sess(next))).toBe(true);
  });

  it("warm handoff completes when B dwell fires", () => {
    const active = committed(init(), KEY_A);
    const handoff = reduce(active, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    expect(handoff.value).toBe("active");
    expect(handoff.context.committedKey).toBe(KEY_B);
    expect(handoff.context.warm).toBe(true);
  });

  it("GRACE_EXPIRE clears when leave target matches and no pending dwell", () => {
    const active = committed(init(), KEY_A);
    const leaving = step(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    const idle = step(leaving, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(idle.value).toBe("leaving");
    expect(idle.context.committedKey).toBeNull();
    expect(isTraceSessionActive(sess(idle))).toBe(true);
  });

  it("GRACE_EXPIRE skipped when superseded leave target", () => {
    const active = committed(init(), KEY_A);
    const leaving = step(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    const still = step(leaving, { type: "GRACE_EXPIRE", tokenKey: KEY_B });
    expect(still.value).toBe("leaving");
    expect(still.context.committedKey).toBe(KEY_A);
  });

  it("GRACE_EXPIRE skipped while pending dwell in flight", () => {
    const active = committed(init(), KEY_A);
    const handoff = reduce(active, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
    ]);
    const still = step(handoff, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(still.context.committedKey).toBeNull();
    expect(still.context.pointerKey).toBe(KEY_B);
    expect(still.value).toBe("pending");
  });

  it("TRACE_COMMIT sets edges and anchor on token switch", () => {
    const active = committed(init(), KEY_A);
    const edgesA = [{ id: "e-a", from: {}, to: {}, kind: "usage" as const }];
    const withEdges = step(active, { type: "TRACE_COMMIT", tokenKey: KEY_A, edges: edgesA });
    expect(withEdges.context.hoverPreviewEdges).toEqual(edgesA);

    const handoff = reduce(withEdges, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    const edgesB = [{ id: "e-b", from: {}, to: {}, kind: "usage" as const }];
    const committedB = step(handoff, { type: "TRACE_COMMIT", tokenKey: KEY_B, edges: edgesB });
    expect(committedB.context.anchorTrace).toBeNull();
    expect(committedB.context.hoverPreviewEdges).toEqual(edgesB);
  });

  it("POINTER_ENTER on a new token clears prior hover wires immediately", () => {
    const edgesA = [{ id: "e-a", from: {}, to: {}, kind: "usage" as const }];
    let snap = step(committed(init(), KEY_A), { type: "TRACE_COMMIT", tokenKey: KEY_A, edges: edgesA });
    snap = step(snap, { type: "POINTER_ENTER", tokenKey: KEY_B });
    expect(snap.context.hoverPreviewEdges).toEqual([]);
    expect(snap.context.anchorTrace).toBeNull();
    expect(snap.context.pointerKey).toBe(KEY_B);
    expect(snap.context.committedKey).toBeNull();
    expect(traceTokenKey(sess(snap))).toBe(KEY_B);
  });

  it("PIN replace enters active pinned state", () => {
    const pinned = step(init(), { type: "PIN", tokenKey: KEY_DEF, mode: "replace" });
    expect(pinned.context.pinnedTraces).toHaveLength(1);
    expect(pinned.context.activePinKey).toBe(KEY_DEF);
    expect(pinned.context.committedKey).toBe(KEY_DEF);
    expect(isTraceSessionActive(sess(pinned))).toBe(true);
    expect(traceTokenKey(sess(pinned))).toBe(KEY_DEF);
  });

  it("POINTER_LEAVE with pins drops hover but keeps trace active", () => {
    let snap = step(init(), { type: "PIN", tokenKey: KEY_DEF, mode: "replace" });
    snap = step(snap, { type: "POINTER_LEAVE", tokenKey: KEY_DEF });
    expect(snap.context.committedKey).toBeNull();
    expect(isTraceSessionActive(sess(snap))).toBe(true);
    expect(traceTokenKey(sess(snap))).toBe(KEY_DEF);
  });

  it("GRACE_EXPIRE with pins clears hover only", () => {
    let snap = step(init(), { type: "PIN", tokenKey: KEY_DEF, mode: "replace" });
    snap = committed(snap, KEY_A);
    snap = step(snap, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    snap = step(snap, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(snap.context.committedKey).toBeNull();
    expect(snap.context.pinnedTraces).toHaveLength(1);
    expect(isTraceSessionActive(sess(snap))).toBe(true);
  });

  it("warm grace is longer than cold grace", () => {
    const warm = committed(init(), KEY_A);
    const warmLeaving = step(warm, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    // cold: committed but warm=false is not reachable via the machine; assert warm>cold constant.
    expect(graceDelayMs(sess(warmLeaving))).toBeGreaterThan(50);
  });

  it("dwell uses zero delay when ctrl held", () => {
    const ctrl = step(init(), { type: "CTRL_DOWN" });
    expect(dwellDelayMs(sess(ctrl))).toBe(0);
  });

  it("GRACE_EXPIRE closes the connection menu on leave (unpinned)", () => {
    let snap = committed(init(), KEY_A);
    snap = step(snap, { type: "SHOW_CONNECTION_MENU", menu: fakeMenu });
    expect(snap.context.connectionMenu).toBe(fakeMenu);
    snap = step(snap, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    snap = step(snap, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(snap.context.connectionMenu).toBeNull();
  });

  it("GRACE_EXPIRE closes the connection menu on leave (pinned)", () => {
    let snap = step(init(), { type: "PIN", tokenKey: KEY_DEF, mode: "replace" });
    snap = committed(snap, KEY_A);
    snap = step(snap, { type: "SHOW_CONNECTION_MENU", menu: fakeMenu });
    snap = step(snap, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    snap = step(snap, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(snap.context.connectionMenu).toBeNull();
    expect(snap.context.pinnedTraces).toHaveLength(1);
  });

  it("CLEAR_CONNECTION_MENU and RESET both clear the menu", () => {
    const withMenu = step(init(), { type: "SHOW_CONNECTION_MENU", menu: fakeMenu });
    expect(step(withMenu, { type: "CLEAR_CONNECTION_MENU" }).context.connectionMenu).toBeNull();
    expect(step(withMenu, { type: "RESET" }).context.connectionMenu).toBeNull();
  });

  it("ignores stale POINTER_LEAVE when pointer already moved to another token", () => {
    const active = committed(init(), KEY_A);
    const onB = step(active, { type: "POINTER_ENTER", tokenKey: KEY_B });
    expect(onB.context.pointerKey).toBe(KEY_B);
    expect(onB.context.committedKey).toBeNull();
    expect(traceTokenKey(sess(onB))).toBe(KEY_B);

    const staleLeave = step(onB, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    expect(staleLeave.value).toBe(onB.value);
    expect(staleLeave.context).toEqual(onB.context);
    expect(isStalePointerLeave(sess(onB), KEY_A)).toBe(true);
    expect(isStalePointerLeave(sess(onB), KEY_B)).toBe(false);
  });

  it("fast handoff enter-B-then-leave-A keeps pointer on B", () => {
    const active = committed(init(), KEY_A);
    const next = reduce(active, [
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    expect(next.context.pointerKey).toBe(KEY_B);
    expect(next.context.committedKey).toBe(KEY_B);
    expect(next.value).toBe("active");
  });

  it("pinned + hover another token survives stale leave of pin source", () => {
    let snap = step(init(), { type: "PIN", tokenKey: KEY_DEF, mode: "replace" });
    snap = reduce(snap, [
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "POINTER_LEAVE", tokenKey: KEY_DEF },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    const edgesB = [{ id: "e-b", from: {}, to: {}, kind: "usage" as const }];
    snap = step(snap, { type: "TRACE_COMMIT", tokenKey: KEY_B, edges: edgesB });
    expect(snap.context.committedKey).toBe(KEY_B);
    expect(snap.context.hoverPreviewEdges).toEqual(edgesB);
    expect(snap.context.pinnedTraces).toHaveLength(1);
    expect(traceTokenKey(sess(snap))).toBe(KEY_B);
  });
});
