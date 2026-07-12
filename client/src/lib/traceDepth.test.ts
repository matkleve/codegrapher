import { describe, expect, it } from "vitest";
import {
  depthFromHop,
  previewHopFromDepth,
  traceGlowOpacity,
  tracePathOpacity,
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

  it("fades path opacity with distance at maxDepth 5", () => {
    expect(tracePathOpacity(1, 5)).toBe(1);
    expect(tracePathOpacity(2, 5)).toBeCloseTo(0.76, 1);
    expect(tracePathOpacity(3, 5)).toBeCloseTo(0.54, 1);
    expect(tracePathOpacity(5, 5)).toBeCloseTo(0.2, 2);
  });

  it("scales fade curve when maxDepth grows", () => {
    const atTen = tracePathOpacity(10, 10);
    expect(atTen).toBeCloseTo(0.2, 2);
    expect(tracePathOpacity(5, 10)).toBeGreaterThan(atTen);
  });

  it("derives glow from path opacity", () => {
    expect(traceGlowOpacity(2, 5)).toBeCloseTo(0.13, 1);
    expect(traceGlowOpacity(5, 5)).toBeCloseTo(0.034, 2);
  });
});
