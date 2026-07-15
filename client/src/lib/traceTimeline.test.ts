import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  beginTraceTimeline,
  getTraceTimelineSnapshot,
  markTracePhase,
  recordTokenPin,
  resetTraceTimeline,
  shortTokenKey,
} from "@/lib/traceTimeline";

describe("traceTimeline", () => {
  const priorSearch = window.location.search;

  beforeEach(() => {
    window.history.replaceState({}, "", "?trace-debug=1");
    resetTraceTimeline();
  });

  afterEach(() => {
    window.history.replaceState({}, "", priorSearch || "/");
  });

  it("builds deltas from pointer enter", () => {
    beginTraceTimeline("key-a");
    markTracePhase("signalEmit");
    markTracePhase("traceCommit");

    const report = getTraceTimelineSnapshot().report;
    expect(report).toHaveLength(3);
    expect(report[0].phase).toBe("pointerEnter");
    expect(report[0].deltaMs).toBe(0);
    expect(report[1].phase).toBe("signalEmit");
    expect(report[2].phase).toBe("traceCommit");
    expect(report[2].atMs).toBeGreaterThanOrEqual(report[1].atMs);
  });

  it("returns stable snapshot reference between reads", () => {
    beginTraceTimeline("key-a");
    const a = getTraceTimelineSnapshot();
    const b = getTraceTimelineSnapshot();
    expect(a).toBe(b);
    expect(a.report).toBe(b.report);
  });

  it("shortens token keys for display", () => {
    expect(
      shortTokenKey(
        "mod::def:function:/home/user/project/helpers.ts:extractFieldValue",
      ),
    ).toBe("extractFieldValue");
  });

  it("records click pin without pointer enter", () => {
    recordTokenPin("pin-key");
    const snap = getTraceTimelineSnapshot();
    expect(snap.report[0]?.phase).toBe("tokenPin");
    expect(snap.shortToken).toBe("pin-key");
  });

  it("is inactive without trace-debug query param", () => {
    window.history.replaceState({}, "", "/");
    resetTraceTimeline();
    beginTraceTimeline("key-a");
    expect(getTraceTimelineSnapshot().report).toHaveLength(0);
  });
});
