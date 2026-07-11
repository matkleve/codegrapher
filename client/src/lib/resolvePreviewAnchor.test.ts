import { describe, expect, it } from "vitest";
import { cubicPath } from "@/lib/resolvePreviewAnchor";

describe("cubicPath", () => {
  it("exits horizontally before bending on vertical spans", () => {
    const path = cubicPath(100, 50, 180, 200, "right", "left");
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
    expect(Number(match![4])).toBeGreaterThan(180);
  });

  it("extends stubs outward and bends below shallow spans", () => {
    const path = cubicPath(40, 100, 200, 105, "right", "left");
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(68);
    expect(Number(match![3])).toBeLessThan(172);
    expect(Number(match![2])).toBeGreaterThan(105);
    expect(Number(match![4])).toBeGreaterThan(105);
  });

  it("fans parallel shallow wires with lane spread", () => {
    const base = cubicPath(40, 100, 200, 105, "right", "left", { clearance: 32 });
    const lane = cubicPath(40, 100, 200, 105, "right", "left", { clearance: 32, lane: 1 });
    expect(base).not.toBe(lane);
  });

  it("bends below shallow diagonal fan-in", () => {
    const path = cubicPath(40, 60, 220, 100, "right", "left", { clearance: 32 });
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![2])).toBeGreaterThan(100);
    expect(Number(match![4])).toBeGreaterThan(100);
  });
});
