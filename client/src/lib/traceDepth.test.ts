import { describe, expect, it } from "vitest";
import {
  applyPointerHoverBoost,
  depthFromHop,
  previewHopFromDepth,
  traceGlowOpacity,
  tracePathOpacity,
  traceStrengthAtDistance,
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

  it("is full strength at distance 1", () => {
    expect(tracePathOpacity(1, 5)).toBe(1);
    expect(traceGlowOpacity(1, 5)).toBeGreaterThan(0.12);
  });

  it("fades continuously with distance", () => {
    const d2 = tracePathOpacity(2, 5);
    const d3 = tracePathOpacity(3, 5);
    const d5 = tracePathOpacity(5, 5);
    expect(d2).toBeCloseTo(0.83, 1);
    expect(d3).toBeCloseTo(0.64, 1);
    expect(d5).toBeCloseTo(0.2, 2);
    expect(d2).toBeGreaterThan(d3);
    expect(d3).toBeGreaterThan(d5);
  });

  it("scales fade curve when maxDepth grows", () => {
    const atTen = tracePathOpacity(10, 10);
    expect(atTen).toBeCloseTo(0.2, 2);
    expect(tracePathOpacity(5, 10)).toBeGreaterThan(atTen);
  });

  it("maps wire path and glow from the same distance curve", () => {
    const at3 = traceWireOpacity(3, 5);
    expect(at3.path).toBe(tracePathOpacity(3, 5));
    expect(at3.glow).toBe(traceGlowOpacity(3, 5));
    expect(at3.path).toBeGreaterThan(at3.glow);
  });

  it("boosts pointer-emphasized surfaces above trace-only strength", () => {
    expect(applyPointerHoverBoost(0.64, true)).toBeCloseTo(0.864, 2);
    expect(applyPointerHoverBoost(1, true)).toBe(1);
    expect(traceStrengthAtDistance(3, 5, true)).toBeGreaterThan(tracePathOpacity(3, 5));
    const boosted = traceWireOpacity(3, 5, true);
    expect(boosted.path).toBeGreaterThan(traceWireOpacity(3, 5).path);
    expect(boosted.glow).toBeGreaterThan(traceWireOpacity(3, 5).glow);
  });
});
