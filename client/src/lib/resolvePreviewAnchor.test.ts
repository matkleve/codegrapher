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

  it("arcs above same-row spans", () => {
    const path = cubicPath(40, 100, 200, 105, "right", "left");
    const match = path.match(/C ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![2])).toBeLessThan(100);
  });
});
