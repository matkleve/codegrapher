import { describe, expect, it } from "vitest";
import { orthogonalPath, previewWirePath } from "@/lib/wirePaths";

describe("orthogonalPath", () => {
  it("uses only horizontal and vertical segments", () => {
    const path = orthogonalPath(40, 100, 200, 180, "right", "left");
    expect(path).not.toMatch(/C /);
    const coords = path.match(/-?[\d.]+/g)!.map(Number);
    const xs = [coords[0], coords[2], coords[4], coords[6], coords[8], coords[10]];
    const ys = [coords[1], coords[3], coords[5], coords[7], coords[9], coords[11]];
    for (let i = 0; i < xs.length - 1; i++) {
      const sameX = xs[i] === xs[i + 1];
      const sameY = ys[i] === ys[i + 1];
      expect(sameX || sameY).toBe(true);
    }
  });

  it("routes trunk outside the horizontal run on left-to-right fan-out", () => {
    const path = orthogonalPath(40, 100, 200, 160, "right", "left");
    const coords = path.match(/-?[\d.]+/g)!.map(Number);
    const exitX = coords[2];
    const entryX = coords[8];
    const trunkX = coords[4];
    expect(trunkX).toBeGreaterThan(Math.max(exitX, entryX));
  });

  it("staggers parallel branch wires via lane", () => {
    const a = orthogonalPath(40, 100, 200, 160, "right", "left", { lane: 0 });
    const b = orthogonalPath(40, 100, 200, 180, "right", "left", { lane: 1 });
    const trunkA = Number(a.match(/-?[\d.]+/g)![4]);
    const trunkB = Number(b.match(/-?[\d.]+/g)![4]);
    expect(trunkB).toBeGreaterThan(trunkA);
  });
});

describe("previewWirePath", () => {
  it("returns orthogonal paths for control-flow branches", () => {
    const path = previewWirePath({
      connectionKind: "branch",
      x1: 40,
      y1: 100,
      x2: 200,
      y2: 160,
      fromSide: "right",
      toSide: "left",
      fromEl: null,
      toEl: null,
    });
    expect(path).not.toMatch(/C /);
  });

  it("returns cubic paths for usage wires", () => {
    const path = previewWirePath({
      connectionKind: "usage",
      x1: 40,
      y1: 100,
      x2: 200,
      y2: 105,
      fromSide: "right",
      toSide: "left",
      fromEl: null,
      toEl: null,
    });
    expect(path).toMatch(/^M .+ C .+, .+, .+$/);
  });

  it("returns cubic paths for binding and transitive", () => {
    for (const connectionKind of ["binding", "transitive"] as const) {
      const path = previewWirePath({
        connectionKind,
        x1: 40,
        y1: 100,
        x2: 200,
        y2: 160,
        fromSide: "right",
        toSide: "left",
        fromEl: null,
        toEl: null,
      });
      expect(path).toMatch(/ C /);
    }
  });
});
