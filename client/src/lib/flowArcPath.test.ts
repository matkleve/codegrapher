import { describe, expect, it } from "vitest";
import { flowArcPath, pointOnArc } from "@/lib/flowArcPath";

describe("flowArcPath", () => {
  it("starts and ends exactly at the given endpoints", () => {
    const path = flowArcPath(0, 0, 40, 0);
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path.endsWith("40 0")).toBe(true);
  });

  it("degenerates to a straight line for a zero-length hop", () => {
    expect(flowArcPath(10, 10, 10, 10)).toBe("M 10 10 L 10 10");
  });

  it("bulges the midpoint off the straight line for a normal hop", () => {
    const path = flowArcPath(0, 0, 40, 0);
    const match = /Q ([\d.-]+) ([\d.-]+),/.exec(path);
    expect(match).not.toBeNull();
    const controlY = Number(match![2]);
    expect(controlY).not.toBe(0);
  });
});

describe("pointOnArc", () => {
  it("is at the start point when t = 0", () => {
    expect(pointOnArc(0, 0, 40, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("is at the end point when t = 1", () => {
    expect(pointOnArc(0, 0, 40, 0, 1)).toEqual({ x: 40, y: 0 });
  });

  it("falls on the bulge (off the straight line) at the midpoint", () => {
    const mid = pointOnArc(0, 0, 40, 0, 0.5);
    expect(mid.y).not.toBe(0);
  });

  it("collapses to the shared point for a zero-length hop at any t", () => {
    expect(pointOnArc(5, 5, 5, 5, 0.5)).toEqual({ x: 5, y: 5 });
  });
});
