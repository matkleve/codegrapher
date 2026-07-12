import { describe, expect, it } from "vitest";
import {
  depthFromHop,
  previewHopFromDepth,
  TRACE_UNINVOLVED_IN_TRACE,
  traceGlowOpacity,
  tracePathOpacity,
  traceWireOpacity,
} from "@/lib/traceDepth";

describe("traceDepth", () => {
  it("maps focus distance to preview hop", () => {
    expect(previewHopFromDepth(1)).toBeUndefined();
    expect(previewHopFromDepth(2)).toBe(2);
    expect(previewHopFromDepth(5)).toBe(5);
    expect(previewHopFromDepth(9)).toBe(5);
  });

  it("normalizes hop to depth", () => {
    expect(depthFromHop(undefined)).toBe(1);
    expect(depthFromHop(2)).toBe(2);
    expect(depthFromHop(4)).toBe(4);
  });

  it("keeps committed trace at full distance-1 strength", () => {
    expect(tracePathOpacity(1, 5, "baseline")).toBe(1);
    expect(traceGlowOpacity(1, 5, "baseline")).toBeGreaterThan(0.12);
  });

  it("dims only uninvolved distance-1 members during pointer emphasis", () => {
    expect(tracePathOpacity(1, 5, "emphasis")).toBe(TRACE_UNINVOLVED_IN_TRACE);
    expect(TRACE_UNINVOLVED_IN_TRACE).toBeLessThan(1);
  });

  it("fades path opacity with distance at baseline", () => {
    expect(tracePathOpacity(2, 5, "baseline")).toBeCloseTo(0.76, 1);
    expect(tracePathOpacity(3, 5, "baseline")).toBeCloseTo(0.54, 1);
    expect(tracePathOpacity(5, 5, "baseline")).toBeCloseTo(0.2, 2);
  });

  it("uses a flatter emphasis curve so provenance hops stay brighter", () => {
    const baselineHop2 = tracePathOpacity(2, 5, "baseline");
    const emphasisHop2 = tracePathOpacity(2, 5, "emphasis");
    const emphasisHop3 = tracePathOpacity(3, 5, "emphasis");
    expect(emphasisHop2).toBeGreaterThan(baselineHop2);
    expect(emphasisHop2).toBeGreaterThan(0.88);
    expect(emphasisHop3).toBeGreaterThan(tracePathOpacity(3, 5, "baseline"));
  });

  it("scales fade curve when maxDepth grows", () => {
    const atTen = tracePathOpacity(10, 10, "baseline");
    expect(atTen).toBeCloseTo(0.2, 2);
    expect(tracePathOpacity(5, 10, "baseline")).toBeGreaterThan(atTen);
  });

  it("snaps emphasized wires to full path + bright glow", () => {
    const emphasized = traceWireOpacity(2, 5, true, false);
    const backdrop = traceWireOpacity(1, 5, false, true);
    const baseline = traceWireOpacity(1, 5, false, false);
    expect(emphasized.path).toBe(1);
    expect(emphasized.glow).toBeGreaterThanOrEqual(0.58);
    expect(emphasized.glow).toBeGreaterThan(baseline.glow * 2);
    expect(backdrop.path).toBeLessThan(baseline.path);
  });
});
