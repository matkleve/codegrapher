import { describe, expect, it } from "vitest";
import { cubicPath } from "@/lib/resolvePreviewAnchor";

describe("cubicPath", () => {
  it("exits horizontally before bending on vertical spans", () => {
    const path = cubicPath(100, 50, 180, 200, "right", "left");
    expect(path).toMatch(/^M 100 50 C .+, .+, 180 200$/);
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(100);
    expect(Number(match![2])).toBe(50);
    expect(Number(match![4])).toBe(200);
    expect(Number(match![3])).toBeLessThan(180);
  });

  it("keeps right exit tangent when target is left of source", () => {
    const path = cubicPath(320, 40, 80, 180, "right", "left");
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(320);
    expect(Number(match![2])).toBe(40);
    expect(Number(match![3])).toBeLessThan(80);
    expect(Number(match![4])).toBe(180);
  });

  it("detours right on left-to-right spans", () => {
    const path = cubicPath(40, 100, 200, 105, "right", "left");
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(70);
    expect(Number(match![2])).toBe(100);
    expect(Number(match![3])).toBeLessThan(170);
    expect(Number(match![4])).toBe(105);
  });

  it("detours left on right-to-left spans", () => {
    const path = cubicPath(220, 100, 40, 105, "right", "left");
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(250);
    expect(Number(match![3])).toBeLessThan(10);
  });

  it("detours horizontally on shallow diagonal fan-in", () => {
    const path = cubicPath(40, 60, 220, 100, "right", "left");
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(70);
    expect(Number(match![3])).toBeLessThan(190);
    expect(Number(match![2])).toBe(60);
    expect(Number(match![4])).toBe(100);
  });
});
