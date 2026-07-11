import { describe, expect, it } from "vitest";
import {
  branchOrthogonalPath,
  computeBranchBusX,
  layoutBranchFanPaths,
  orthogonalPath,
  previewWirePath,
} from "@/lib/wirePaths";

const SVG_BOX = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;

function mockEl(rect: DOMRectInit, opts?: { lineRect?: DOMRectInit }): HTMLElement {
  const el = {
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
    closest: (selector: string) => {
      if (selector !== ".code-line" || !opts?.lineRect) return null;
      return {
        isConnected: true,
        getBoundingClientRect: () => ({
          x: opts.lineRect!.left ?? 0,
          y: opts.lineRect!.top ?? 0,
          left: opts.lineRect!.left ?? 0,
          top: opts.lineRect!.top ?? 0,
          right: opts.lineRect!.right ?? 0,
          bottom: opts.lineRect!.bottom ?? 0,
          width: (opts.lineRect!.right ?? 0) - (opts.lineRect!.left ?? 0),
          height: (opts.lineRect!.bottom ?? 0) - (opts.lineRect!.top ?? 0),
          toJSON: () => ({}),
        }),
      };
    },
  } as HTMLElement;
  return el;
}

describe("computeBranchBusX", () => {
  it("places the bus left of every branch chip", () => {
    const busX = computeBranchBusX(
      [
        { x2: 65, y2: 139, toEl: mockEl({ left: 60, right: 110, top: 130, bottom: 148 }) },
        { x2: 65, y2: 169, toEl: mockEl({ left: 72, right: 120, top: 160, bottom: 178 }) },
      ],
      SVG_BOX,
    );
    expect(busX).toBe(60 - 24 - 12);
  });
});

describe("branchOrthogonalPath", () => {
  it("routes through the left gutter — down, across below head, bus, tap right", () => {
    const switchEl = mockEl(
      { left: 80, right: 160, top: 100, bottom: 118 },
      { lineRect: { left: 40, right: 320, top: 98, bottom: 122 } },
    );
    const caseEl = mockEl({ left: 60, right: 110, top: 130, bottom: 148 });
    const path = branchOrthogonalPath(70, 109, 65, 139, switchEl, caseEl, SVG_BOX);
    const nums = path.match(/-?[\d.]+/g)!.map(Number);
    const startX = nums[0];
    const busTopY = nums[3];
    const busX = nums[4];
    const spurBusX = nums[8];
    const entryX = nums[10];
    expect(startX).toBeGreaterThan(160);
    expect(busTopY).toBeGreaterThan(122);
    expect(busX).toBe(24);
    expect(spurBusX).toBe(busX);
    expect(entryX).toBeLessThan(60);
    expect(nums[12]).toBe(65);
  });

  it("keeps the tap horizontal segment in the gutter left of case text", () => {
    const switchEl = mockEl(
      { left: 80, right: 160, top: 100, bottom: 118 },
      { lineRect: { left: 40, right: 320, top: 98, bottom: 122 } },
    );
    const caseEl = mockEl({ left: 60, right: 110, top: 130, bottom: 148 });
    const path = branchOrthogonalPath(70, 109, 65, 139, switchEl, caseEl, SVG_BOX);
    const nums = path.match(/-?[\d.]+/g)!.map(Number);
    const busX = nums[8];
    const entryX = nums[10];
    expect(busX).toBeLessThan(entryX);
    expect(entryX).toBeLessThan(60);
  });
});

describe("layoutBranchFanPaths", () => {
  it("draws one shared bus on the first path and gutter taps on the rest", () => {
    const switchEl = mockEl(
      { left: 80, right: 160, top: 100, bottom: 118 },
      { lineRect: { left: 40, right: 320, top: 98, bottom: 122 } },
    );
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
    expect(paths[0]).toContain("L 24 130");
    expect(paths[0]).toContain("L 24 169");
    expect(paths[1]).toMatch(/^M 24 169/);
    expect(paths[1]).not.toContain("M 163");
  });
});

describe("orthogonalPath", () => {
  it("uses only horizontal and vertical segments", () => {
    const path = orthogonalPath(40, 100, 200, 180, "right", "left");
    expect(path).not.toMatch(/C /);
  });
});

describe("previewWirePath", () => {
  it("returns gutter-bus orthogonal paths for control-flow branches", () => {
    const from = mockEl(
      { left: 80, right: 160, top: 100, bottom: 118 },
      { lineRect: { left: 40, right: 320, top: 98, bottom: 122 } },
    );
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
    const busX = Number(path.match(/-?[\d.]+/g)![4]);
    expect(busX).toBeLessThan(60);
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
