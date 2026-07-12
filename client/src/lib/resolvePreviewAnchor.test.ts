import { describe, expect, it } from "vitest";
import { cubicPath, treeSpinePath, typesettingPortSides } from "@/lib/resolvePreviewAnchor";

describe("typesettingPortSides", () => {
  it("always uses type right and param left for above-line routing", () => {
    expect(typesettingPortSides(300, 50)).toEqual({ fromSide: "right", toSide: "left" });
    expect(typesettingPortSides(50, 300)).toEqual({ fromSide: "right", toSide: "left" });
  });
});

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

  it("uses a straight segment when endpoints are nearly colocated", () => {
    const path = cubicPath(100, 50, 108, 52, "right", "left");
    expect(path).toMatch(/^M [\d.+-]+ [\d.+-]+ L [\d.+-]+ [\d.+-]+$/);
    expect(path).not.toMatch(/C /);
  });

  it("keeps shallow control handles inside the span so the curve does not loop", () => {
    const path = cubicPath(100, 50, 130, 55, "right", "left", { clearance: 32 });
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    const c1x = Number(match![1]);
    const c2x = Number(match![3]);
    expect(c1x).toBeLessThan(130);
    expect(c2x).toBeGreaterThan(100);
    expect(c1x).toBeLessThanOrEqual(c2x + 2);
    expect(Number(match![2])).toBeLessThan(90);
    expect(Number(match![4])).toBeLessThan(90);
  });

  it("exits toward a nearby target on the left instead of stubbing away", () => {
    const path = cubicPath(200, 50, 160, 52, "right", "left", { clearance: 32 });
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+),/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeLessThan(200);
  });
});

describe("treeSpinePath", () => {
  it("bows the gutter spine instead of a straight vertical", () => {
    const path = treeSpinePath(40, 100, 180, "left");
    expect(path).toMatch(/^M 40 100 C /);
    const match = path.match(/C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+), 40 180/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeLessThan(40);
    expect(Number(match![3])).toBeLessThan(40);
  });
});
