import { describe, expect, it } from "vitest";
import {
  depthFromHop,
  previewHopFromDepth,
  TRACE_CHIP_SESSION_OPACITY,
  TRACE_DEPTH_MIN_OPACITY,
  TRACE_EMPHASIS_MIN_OPACITY,
  TRACE_TUNING,
  TRACE_WIRE_EMPHASIS_PATH_AT_FOCUS,
  TRACE_WIRE_SESSION_PATH_AT_FOCUS,
  traceChipColorStrength,
  traceChipOpacity,
  traceEmphasisPathOpacity,
  traceGlowOpacity,
  tracePathOpacity,
  traceStrength,
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

  it("is full strength at provenance distances on the focus curve", () => {
    expect(tracePathOpacity(1, 5)).toBe(1);
    expect(traceGlowOpacity(1, 5)).toBeLessThan(TRACE_WIRE_SESSION_PATH_AT_FOCUS);
  });

  it("fades focus curve continuously with distance", () => {
    const d2 = tracePathOpacity(2, 5);
    const d3 = tracePathOpacity(3, 5);
    const d5 = tracePathOpacity(5, 5);
    expect(d2).toBeCloseTo(0.83, 1);
    expect(d3).toBeCloseTo(0.64, 1);
    expect(d5).toBeCloseTo(TRACE_DEPTH_MIN_OPACITY, 2);
    expect(d2).toBeGreaterThan(d3);
    expect(d3).toBeGreaterThan(d5);
  });

  it("keeps hover curve flatter and ending much higher than focus", () => {
    const rest3 = tracePathOpacity(3, 5);
    const hover3 = traceEmphasisPathOpacity(3, 5);
    const rest5 = tracePathOpacity(5, 5);
    const hover5 = traceEmphasisPathOpacity(5, 5);
    expect(hover3).toBeGreaterThan(rest3 + 0.15);
    expect(hover5).toBeGreaterThan(rest5 + 0.3);
    expect(hover5).toBeCloseTo(TRACE_EMPHASIS_MIN_OPACITY, 2);
  });

  it("pending chip strength sits below focus at hop 1", () => {
    const pending = traceStrength("pending", "chip", 1);
    const focus = traceStrength("focus", "chip", 1);
    expect(pending).toBe(TRACE_TUNING.pending.chipAtPending);
    expect(pending).toBeLessThan(focus);
  });

  it("keeps hover color strength above focus at the same hop", () => {
    const rest3 = traceChipColorStrength(3, false, 5);
    const hover3 = traceChipColorStrength(3, true, 5);
    expect(hover3).toBeGreaterThan(rest3 + 0.15);
    expect(traceChipColorStrength(1, true)).toBeGreaterThan(traceChipColorStrength(1, false));
  });

  it("keeps wire path louder than glow and chip fill at the same distance", () => {
    const wire = traceWireOpacity(3, false, 5);
    const chip = traceChipColorStrength(3, false, 5);
    expect(wire.path).toBeGreaterThan(wire.glow);
    expect(wire.path).toBeGreaterThan(chip);
    const hoverWire = traceWireOpacity(3, true, 5);
    const hoverChip = traceChipColorStrength(3, true, 5);
    expect(hoverWire.path).toBeGreaterThan(wire.path);
    expect(hoverChip).toBeGreaterThan(chip);
  });

  it("separates session rest from pointer emphasis at focus distance", () => {
    expect(traceWireOpacity(1, false).path).toBe(TRACE_WIRE_SESSION_PATH_AT_FOCUS);
    expect(traceWireOpacity(1, true).path).toBe(TRACE_WIRE_EMPHASIS_PATH_AT_FOCUS);
    expect(traceChipColorStrength(1, false)).toBe(TRACE_CHIP_SESSION_OPACITY);
    expect(traceChipColorStrength(1, true)).toBe(1);
    expect(traceChipOpacity(1, false)).toBe(TRACE_CHIP_SESSION_OPACITY);
  });

  it("scales fade curve when maxDepth grows", () => {
    const atTen = tracePathOpacity(10, 10);
    expect(atTen).toBeCloseTo(TRACE_DEPTH_MIN_OPACITY, 2);
    expect(tracePathOpacity(5, 10)).toBeGreaterThan(atTen);
  });

  it("exposes unified traceStrength for each surface", () => {
    expect(traceStrength("focus", "wire", 3, 5)).toBe(traceWireOpacity(3, false, 5).path);
    expect(traceStrength("hover", "wireGlow", 2, 5)).toBe(traceWireOpacity(2, true, 5).glow);
    expect(traceStrength("focus", "chip", 4, 5)).toBe(traceChipColorStrength(4, false, 5));
    expect(traceStrength("hover", "chip", 1)).toBe(TRACE_TUNING.hover.chipAtFocus);
  });
});
