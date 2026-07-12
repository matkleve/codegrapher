import { describe, expect, it } from "vitest";
import {
  INITIAL_TRACE_SESSION,
  isStalePointerLeave,
  reduceTraceSession,
  traceSessionReducer,
  dwellDelayMs,
  pointerEnterDelayMs,
  graceDelayMs,
  isTraceLeavingMood,
  isTracePendingMood,
  isTraceSessionActive,
  traceTokenKey,
  type TraceSession,
} from "@/lib/traceSessionReducer";

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

function committed(session: TraceSession, key: string): TraceSession {
  return traceSessionReducer(
    traceSessionReducer(session, { type: "POINTER_ENTER", tokenKey: key }),
    { type: "DWELL_FIRE", tokenKey: key },
  );
}

describe("traceSessionReducer", () => {
  it("starts idle", () => {
    expect(INITIAL_TRACE_SESSION.mood).toBe("idle");
    expect(isTraceSessionActive(INITIAL_TRACE_SESSION)).toBe(false);
  });

  it("POINTER_ENTER cold goes pending with pointer set", () => {
    const next = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "POINTER_ENTER",
      tokenKey: KEY_A,
    });
    expect(next.mood).toBe("pending");
    expect(next.pointerKey).toBe(KEY_A);
    expect(next.committedKey).toBeNull();
    expect(isTracePendingMood(next)).toBe(true);
  });

  it("POINTER_ENTER instant commits immediately", () => {
    const next = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "POINTER_ENTER",
      tokenKey: KEY_A,
      instant: true,
    });
    expect(next.mood).toBe("active");
    expect(next.committedKey).toBe(KEY_A);
    expect(next.warm).toBe(true);
  });

  it("DWELL_FIRE commits pending token", () => {
    const pending = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "POINTER_ENTER",
      tokenKey: KEY_A,
    });
    const active = traceSessionReducer(pending, { type: "DWELL_FIRE", tokenKey: KEY_A });
    expect(active.mood).toBe("active");
    expect(active.committedKey).toBe(KEY_A);
  });

  it("POINTER_LEAVE before dwell clears instantly", () => {
    const pending = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "POINTER_ENTER",
      tokenKey: KEY_A,
    });
    const idle = traceSessionReducer(pending, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    expect(idle.mood).toBe("idle");
    expect(idle.pointerKey).toBeNull();
    expect(graceDelayMs(idle)).toBe(0);
  });

  it("POINTER_LEAVE after commit enters leaving mood", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const leaving = traceSessionReducer(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    expect(leaving.mood).toBe("leaving");
    expect(leaving.committedKey).toBe(KEY_A);
    expect(leaving.pointerKey).toBeNull();
    expect(isTraceLeavingMood(leaving)).toBe(true);
    expect(graceDelayMs(leaving)).toBeGreaterThan(0);
  });

  it("POINTER_ENTER re-emphasizes committed token instantly", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const leaving = traceSessionReducer(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    const reenter = traceSessionReducer(leaving, { type: "POINTER_ENTER", tokenKey: KEY_A });
    expect(reenter.mood).toBe("active");
    expect(reenter.committedKey).toBe(KEY_A);
    expect(reenter.pointerKey).toBe(KEY_A);
    expect(reenter.pendingTargetKey).toBeNull();
    expect(pointerEnterDelayMs(leaving, KEY_A)).toBe(0);
  });

  it("warm handoff leave-then-enter same batch stays active", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const next = reduceTraceSession(active, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
    ]);
    expect(next.mood).toBe("pending");
    expect(next.committedKey).toBeNull();
    expect(next.pointerKey).toBe(KEY_B);
    expect(traceTokenKey(next)).toBe(KEY_B);
    expect(isTraceSessionActive(next)).toBe(true);
  });

  it("warm handoff completes when B dwell fires", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const handoff = reduceTraceSession(active, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    expect(handoff.mood).toBe("active");
    expect(handoff.committedKey).toBe(KEY_B);
    expect(handoff.warm).toBe(true);
  });

  it("GRACE_EXPIRE clears when leave target matches and no pending dwell", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const leaving = traceSessionReducer(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    const idle = traceSessionReducer(leaving, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(idle.mood).toBe("leaving");
    expect(idle.committedKey).toBeNull();
    expect(isTraceSessionActive(idle)).toBe(true);
  });

  it("GRACE_EXPIRE skipped when superseded leave target", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const leaving = traceSessionReducer(active, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    const still = traceSessionReducer(leaving, { type: "GRACE_EXPIRE", tokenKey: KEY_B });
    expect(still.mood).toBe("leaving");
    expect(still.committedKey).toBe(KEY_A);
  });

  it("GRACE_EXPIRE skipped while pending dwell in flight", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const handoff = reduceTraceSession(active, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
    ]);
    const still = traceSessionReducer(handoff, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(still.committedKey).toBeNull();
    expect(still.pointerKey).toBe(KEY_B);
    expect(still.mood).toBe("pending");
  });

  it("TRACE_COMMIT sets edges and anchor on token switch", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const edgesA = [{ id: "e-a", from: {}, to: {}, kind: "usage" as const }];
    const withEdges = traceSessionReducer(active, {
      type: "TRACE_COMMIT",
      tokenKey: KEY_A,
      edges: edgesA,
    });
    expect(withEdges.hoverPreviewEdges).toEqual(edgesA);

    const handoff = reduceTraceSession(withEdges, [
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    const edgesB = [{ id: "e-b", from: {}, to: {}, kind: "usage" as const }];
    const committedB = traceSessionReducer(handoff, {
      type: "TRACE_COMMIT",
      tokenKey: KEY_B,
      edges: edgesB,
    });
    expect(committedB.anchorTrace).toBeNull();
    expect(committedB.hoverPreviewEdges).toEqual(edgesB);
  });

  it("POINTER_ENTER on a new token clears prior hover wires immediately", () => {
    const edgesA = [{ id: "e-a", from: {}, to: {}, kind: "usage" as const }];
    let session = traceSessionReducer(committed(INITIAL_TRACE_SESSION, KEY_A), {
      type: "TRACE_COMMIT",
      tokenKey: KEY_A,
      edges: edgesA,
    });
    session = traceSessionReducer(session, { type: "POINTER_ENTER", tokenKey: KEY_B });
    expect(session.hoverPreviewEdges).toEqual([]);
    expect(session.anchorTrace).toBeNull();
    expect(session.pointerKey).toBe(KEY_B);
    expect(session.committedKey).toBeNull();
    expect(traceTokenKey(session)).toBe(KEY_B);
  });

  it("PIN replace enters active pinned state", () => {
    const pinned = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "PIN",
      tokenKey: KEY_DEF,
      mode: "replace",
    });
    expect(pinned.pinnedTraces).toHaveLength(1);
    expect(pinned.activePinKey).toBe(KEY_DEF);
    expect(pinned.committedKey).toBe(KEY_DEF);
    expect(isTraceSessionActive(pinned)).toBe(true);
    expect(traceTokenKey(pinned)).toBe(KEY_DEF);
  });

  it("POINTER_LEAVE with pins drops hover but keeps trace active", () => {
    let session = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "PIN",
      tokenKey: KEY_DEF,
      mode: "replace",
    });
    session = traceSessionReducer(session, { type: "POINTER_LEAVE", tokenKey: KEY_DEF });
    expect(session.committedKey).toBeNull();
    expect(isTraceSessionActive(session)).toBe(true);
    expect(traceTokenKey(session)).toBe(KEY_DEF);
  });

  it("GRACE_EXPIRE with pins clears hover only", () => {
    let session = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "PIN",
      tokenKey: KEY_DEF,
      mode: "replace",
    });
    session = committed(session, KEY_A);
    session = traceSessionReducer(session, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    session = traceSessionReducer(session, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(session.committedKey).toBeNull();
    expect(session.pinnedTraces).toHaveLength(1);
    expect(isTraceSessionActive(session)).toBe(true);
  });

  it("warm grace is longer than cold grace", () => {
    const warm = committed(INITIAL_TRACE_SESSION, KEY_A);
    const coldLeaving = traceSessionReducer(
      { ...INITIAL_TRACE_SESSION, warm: false },
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
    );
    const warmLeaving = traceSessionReducer(warm, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    expect(graceDelayMs(warmLeaving)).toBeGreaterThan(graceDelayMs(coldLeaving));
  });

  it("dwell uses zero delay when ctrl held", () => {
    const ctrl = traceSessionReducer(INITIAL_TRACE_SESSION, { type: "CTRL_DOWN" });
    expect(dwellDelayMs(ctrl)).toBe(0);
  });

  it("GRACE_EXPIRE closes the connection menu on leave (unpinned)", () => {
    let session = committed(INITIAL_TRACE_SESSION, KEY_A);
    session = traceSessionReducer(session, {
      type: "SHOW_CONNECTION_MENU",
      menu: fakeMenu,
    });
    expect(session.connectionMenu).toBe(fakeMenu);

    session = traceSessionReducer(session, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    session = traceSessionReducer(session, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(session.connectionMenu).toBeNull();
  });

  it("GRACE_EXPIRE closes the connection menu on leave (pinned)", () => {
    let session = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "PIN",
      tokenKey: KEY_DEF,
      mode: "replace",
    });
    session = committed(session, KEY_A);
    session = traceSessionReducer(session, {
      type: "SHOW_CONNECTION_MENU",
      menu: fakeMenu,
    });
    session = traceSessionReducer(session, { type: "POINTER_LEAVE", tokenKey: KEY_A });
    session = traceSessionReducer(session, { type: "GRACE_EXPIRE", tokenKey: KEY_A });
    expect(session.connectionMenu).toBeNull();
    expect(session.pinnedTraces).toHaveLength(1);
  });

  it("CLEAR_CONNECTION_MENU and RESET both clear the menu", () => {
    const withMenu = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "SHOW_CONNECTION_MENU",
      menu: fakeMenu,
    });
    expect(
      traceSessionReducer(withMenu, { type: "CLEAR_CONNECTION_MENU" }).connectionMenu,
    ).toBeNull();
    expect(traceSessionReducer(withMenu, { type: "RESET" }).connectionMenu).toBeNull();
  });

  it("ignores stale POINTER_LEAVE when pointer already moved to another token", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const onB = traceSessionReducer(active, {
      type: "POINTER_ENTER",
      tokenKey: KEY_B,
    });
    expect(onB.pointerKey).toBe(KEY_B);
    expect(onB.committedKey).toBeNull();
    expect(traceTokenKey(onB)).toBe(KEY_B);

    const staleLeave = traceSessionReducer(onB, {
      type: "POINTER_LEAVE",
      tokenKey: KEY_A,
    });
    expect(staleLeave).toBe(onB);
    expect(isStalePointerLeave(onB, KEY_A)).toBe(true);
    expect(isStalePointerLeave(onB, KEY_B)).toBe(false);
  });

  it("fast handoff enter-B-then-leave-A keeps pointer on B", () => {
    const active = committed(INITIAL_TRACE_SESSION, KEY_A);
    const next = reduceTraceSession(active, [
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "POINTER_LEAVE", tokenKey: KEY_A },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    expect(next.pointerKey).toBe(KEY_B);
    expect(next.committedKey).toBe(KEY_B);
    expect(next.mood).toBe("active");
  });

  it("pinned + hover another token survives stale leave of pin source", () => {
    let session = traceSessionReducer(INITIAL_TRACE_SESSION, {
      type: "PIN",
      tokenKey: KEY_DEF,
      mode: "replace",
    });
    session = reduceTraceSession(session, [
      { type: "POINTER_ENTER", tokenKey: KEY_B },
      { type: "POINTER_LEAVE", tokenKey: KEY_DEF },
      { type: "DWELL_FIRE", tokenKey: KEY_B },
    ]);
    const edgesB = [{ id: "e-b", from: {}, to: {}, kind: "usage" as const }];
    session = traceSessionReducer(session, {
      type: "TRACE_COMMIT",
      tokenKey: KEY_B,
      edges: edgesB,
    });
    expect(session.committedKey).toBe(KEY_B);
    expect(session.hoverPreviewEdges).toEqual(edgesB);
    expect(session.pinnedTraces).toHaveLength(1);
    expect(traceTokenKey(session)).toBe(KEY_B);
  });
});
