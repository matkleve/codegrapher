import { describe, expect, it } from "vitest";
import {
  branchOrthogonalPath,
  layoutBranchFanPaths,
  orthogonalPath,
  previewWirePath,
} from "@/lib/wirePaths";

const SVG_BOX = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;

function mockEl(rect: DOMRectInit): HTMLElement {
  return {
    isConnected: true,
    getBoundingClientRect: () => ({
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      right: rect.right ?? 0,
      bottom: rect.bottom ?? 0,
      width: (rect.right ?? 0) - (rect.left ?? 0),
      height: (rect.bottom ?? 0) - (rect.top ?? 0),
      toJSON: () => ({}),
    }),
  } as HTMLElement;
}

describe("branchOrthogonalPath", () => {
  it("goes right then down — no down-right-down jog on switch lines", () => {
    const switchEl = mockEl({ left: 80, right: 160, top: 100, bottom: 118 });
    const caseEl = mockEl({ left: 60, right: 110, top: 130, bottom: 148 });
    const path = branchOrthogonalPath(70, 109, 65, 139, switchEl, caseEl, SVG_BOX);
    const nums = path.match(/-?[\d.]+/g)!.map(Number);
    expect(nums[0]).toBeGreaterThan(160);
    expect(nums[2]).toBe(nums[0] + 24);
    expect(nums[3]).toBe(109);
    expect(nums[4]).toBe(nums[2]);
    expect(nums[5]).toBe(139);
    expect(nums[3]).toBe(nums[1]);
  });

  it("branches left along the target row, then into the anchor", () => {
    const switchEl = mockEl({ left: 80, right: 160, top: 100, bottom: 118 });
    const caseEl = mockEl({ left: 60, right: 110, top: 130, bottom: 148 });
    const path = branchOrthogonalPath(70, 109, 65, 139, switchEl, caseEl, SVG_BOX);
    const nums = path.match(/-?[\d.]+/g)!.map(Number);
    expect(nums[6]).toBe(nums[4]);
    expect(nums[7]).toBe(139);
    expect(nums[8]).toBeLessThan(60);
    expect(nums[9]).toBe(139);
    expect(nums[10]).toBe(65);
  });
});

describe("layoutBranchFanPaths", () => {
  it("draws one shared trunk on the first path and spurs on the rest", () => {
    const switchEl = mockEl({ left: 80, right: 160, top: 100, bottom: 118 });
    const caseA = mockEl({ left: 60, right: 110, top: 130, bottom: 148 });
    const caseB = mockEl({ left: 60, right: 110, top: 160, bottom: 178 });
    const paths = layoutBranchFanPaths(
      70,
      109,
      switchEl,
      [
        { x2: 65, y2: 139, toEl: caseA },
        { x2: 65, y2: 169, toEl: caseB },
      ],
      SVG_BOX,
    );
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatch(/^M .+ L .+ 109 L .+ 169/);
    expect(paths[1]).toMatch(/^M 187 169/);
    expect(paths[1]).not.toContain("L 187 109");
  });
});

describe("orthogonalPath", () => {
  it("uses only horizontal and vertical segments", () => {
    const path = orthogonalPath(40, 100, 200, 180, "right", "left");
    expect(path).not.toMatch(/C /);
  });
});

describe("previewWirePath", () => {
  it("returns bbox-aware orthogonal paths for control-flow branches", () => {
    const from = mockEl({ left: 80, right: 160, top: 100, bottom: 118 });
    const to = mockEl({ left: 60, right: 110, top: 130, bottom: 148 });
    const path = previewWirePath({
      connectionKind: "branch",
      x1: 70,
      y1: 109,
      x2: 65,
      y2: 139,
      fromSide: "left",
      toSide: "left",
      fromEl: from,
      toEl: to,
      svgBox: SVG_BOX,
    });
    expect(path).not.toMatch(/C /);
    const trunkX = Number(path.match(/-?[\d.]+/g)![2]);
    expect(trunkX).toBeLessThan(220);
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
      svgBox: SVG_BOX,
    });
    expect(path).toMatch(/^M .+ C .+, .+, .+$/);
  });
});
