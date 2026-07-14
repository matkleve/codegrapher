import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  armSourceArrival,
  clearWireArrivals,
  getWireArrival,
  getWireHoveredTokenKey,
  getWireSignalEpoch,
  hasWireArrivals,
  isTraceLeavingMood,
  isTracePendingMood,
  isTraceSessionActive,
  isWireSignalEmitting,
  keepWireSignalAlive,
  resetWireSignal,
  setHoverPreviewEdgeIds,
  setTraceDomFading,
  setTraceSessionActive,
  setTraceSessionMood,
  setWireEndpointArrival,
  setWireHoveredTokenKey,
  startWireSignalEpoch,
  stopWireSignalEmitting,
  subscribeTraceSessionMood,
  subscribeTraceStrength,
  subscribeWireArrival,
  isHoverPreviewEdge,
} from "@/lib/trace/traceEngine";

// Singleton store — reset all slices between cases.
beforeEach(() => {
  resetWireSignal();
  clearWireArrivals();
  setWireHoveredTokenKey(null);
  setTraceSessionActive(false);
  setHoverPreviewEdgeIds(new Set());
  setTraceSessionMood("idle");
  setTraceDomFading(false);
});

describe("signal clock", () => {
  it("arms emitting on epoch start and clears on reset", () => {
    expect(isWireSignalEmitting()).toBe(false);
    const epoch = startWireSignalEpoch();
    expect(epoch).toBeGreaterThan(0);
    expect(isWireSignalEmitting()).toBe(true);
    expect(getWireSignalEpoch()).toBe(epoch);
    resetWireSignal();
    expect(isWireSignalEmitting()).toBe(false);
    expect(getWireSignalEpoch()).toBe(0);
  });

  it("keepAlive keeps the signal emitting after the pointer leaves", () => {
    startWireSignalEpoch();
    stopWireSignalEmitting();
    expect(isWireSignalEmitting()).toBe(false);
    keepWireSignalAlive(10_000);
    expect(isWireSignalEmitting()).toBe(true); // fire-and-forget cascade window
  });

  it("keepAlive expires with time", () => {
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    startWireSignalEpoch();
    stopWireSignalEmitting();
    keepWireSignalAlive(100); // alive until 1100
    now.mockReturnValue(1050);
    expect(isWireSignalEmitting()).toBe(true);
    now.mockReturnValue(1200);
    expect(isWireSignalEmitting()).toBe(false);
    now.mockRestore();
  });
});

describe("arrivals", () => {
  it("arms the source at full progress and tracks endpoints", () => {
    armSourceArrival("core");
    expect(getWireArrival("core")).toEqual({ progress: 1, depth: 1 });
    expect(hasWireArrivals()).toBe(true);
    setWireEndpointArrival("leaf", 2, 0.4);
    expect(getWireArrival("leaf")).toEqual({ progress: 0.4, depth: 2 });
  });

  it("is monotonic — never rewinds an in-flight endpoint", () => {
    setWireEndpointArrival("leaf", 2, 0.6);
    setWireEndpointArrival("leaf", 2, 0.3); // lower, still < 1 → ignored
    expect(getWireArrival("leaf")?.progress).toBe(0.6);
    setWireEndpointArrival("leaf", 2, 1); // completing always wins
    expect(getWireArrival("leaf")?.progress).toBe(1);
  });

  it("clamps progress into [0,1]", () => {
    setWireEndpointArrival("a", 1, 5);
    setWireEndpointArrival("b", 1, -3);
    expect(getWireArrival("a")?.progress).toBe(1);
    expect(getWireArrival("b")?.progress).toBe(0);
  });

  it("clearWireArrivals empties the map", () => {
    armSourceArrival("core");
    clearWireArrivals();
    expect(hasWireArrivals()).toBe(false);
  });
});

describe("pointer / emphasis", () => {
  it("stores the hovered token key", () => {
    setWireHoveredTokenKey("tok::1");
    expect(getWireHoveredTokenKey()).toBe("tok::1");
  });

  it("dedupes hover preview edge ids and reports membership", () => {
    setHoverPreviewEdges(["e1", "e2"]);
    expect(isHoverPreviewEdge("e1")).toBe(true);
    expect(isHoverPreviewEdge("e3")).toBe(false);
  });

  it("notifies strength subscribers on session-active change", () => {
    const listener = vi.fn();
    const unsub = subscribeTraceStrength(listener);
    setTraceSessionActive(true);
    expect(listener).toHaveBeenCalledTimes(1);
    setTraceSessionActive(true); // no change → no notify
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    setTraceSessionActive(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(isTraceSessionActive()).toBe(false);
  });
});

describe("mood", () => {
  it("derives pending / leaving from mood + domFading and notifies", () => {
    const listener = vi.fn();
    subscribeTraceSessionMood(listener);
    setTraceSessionMood("pending");
    expect(isTracePendingMood()).toBe(true);
    setTraceSessionMood("leaving");
    expect(isTraceLeavingMood()).toBe(true);
    setTraceSessionMood("idle");
    setTraceDomFading(true);
    expect(isTraceLeavingMood()).toBe(true); // domFading overlaps leaving
    expect(listener.mock.calls.length).toBeGreaterThan(0);
  });
});

// helper kept out of the assertions above for readability
function setHoverPreviewEdges(ids: string[]): void {
  setHoverPreviewEdgeIds(new Set(ids));
}

describe("arrival channel", () => {
  it("subscribeWireArrival fires on arm and unsubscribes", () => {
    const listener = vi.fn();
    const unsub = subscribeWireArrival(listener);
    armSourceArrival("core");
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    armSourceArrival("core2");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
