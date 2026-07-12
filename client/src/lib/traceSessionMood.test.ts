import { describe, expect, it } from "vitest";
import {
  getTraceSessionMood,
  isTraceLeavingMood,
  isTracePendingMood,
  setTraceDomFading,
  setTraceSessionMood,
} from "@/lib/traceSessionMood";

describe("traceSessionMood", () => {
  it("reflects pending and leaving moods", () => {
    setTraceSessionMood("pending");
    expect(getTraceSessionMood()).toBe("pending");
    expect(isTracePendingMood()).toBe(true);
    expect(isTraceLeavingMood()).toBe(false);

    setTraceSessionMood("leaving");
    expect(isTraceLeavingMood()).toBe(true);

    setTraceDomFading(false);
    setTraceSessionMood("idle");
    expect(isTracePendingMood()).toBe(false);
  });
});
