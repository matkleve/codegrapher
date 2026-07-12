import { describe, expect, it } from "vitest";
import {
  branchJunctionPoint,
  branchOrthogonalPath,
  computeBranchBusX,
  layoutBranchFanPaths,
  layoutCubicFanPaths,
  orthogonalPath,
  previewWirePath,
  roundedPolylinePath,
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
    const { paths } = layoutBranchFanPaths(
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
    expect(paths[0]).toContain("L 4 139");
    expect(paths[0]).not.toContain("L 4 169");
    expect(paths[1]).toMatch(/^M 4 169/);
    expect(paths[1]).not.toContain("M 163");
  });
});

describe("layoutCubicFanPaths", () => {
  it("uses gutter taps before clustered same-line targets", () => {
    const defEl = mockEl({ left: 200, right: 280, top: 100, bottom: 118 });
    const { paths, clusterKind } = layoutCubicFanPaths(
      240,
      109,
      defEl,
      [
        { x2: 420, y2: 130, toEl: mockEl({ left: 400, right: 440, top: 122, bottom: 138 }) },
        { x2: 520, y2: 130, toEl: mockEl({ left: 500, right: 540, top: 122, bottom: 138 }) },
      ],
      SVG_BOX,
    );
    expect(clusterKind).toBe("horizontal");
    expect(paths[0]).toMatch(/C .+ C .+ C /);
    expect(paths[1]).toMatch(/^M [\d.+-]+ [\d.+-]+ C /);
    expect(paths[1]).not.toMatch(/\bL /);
  });

  it("keeps solo cubic spurs when targets are far apart vertically", () => {
    const defEl = mockEl({ left: 200, right: 280, top: 100, bottom: 118 });
    const { paths, clusterKind } = layoutCubicFanPaths(
      240,
      109,
      defEl,
      [
        { x2: 420, y2: 130, toEl: mockEl({ left: 400, right: 440, top: 122, bottom: 138 }) },
        { x2: 420, y2: 190, toEl: mockEl({ left: 400, right: 440, top: 182, bottom: 198 }) },
      ],
      SVG_BOX,
    );
    expect(clusterKind).toBe("vertical");
    expect(paths[1]).toMatch(/^M .+ C /);
    expect(paths[1]).not.toMatch(/\bL [\d.]+ [\d.]+ L /);
  });

  it("aims the fan trunk toward the gutter when the bus is left of the source", () => {
    const lineRect = { left: 80, top: 100, right: 400, bottom: 118 };
    const defEl = mockEl({ left: 200, right: 280, top: 104, bottom: 114 }, { lineRect });
    const { paths } = layoutCubicFanPaths(
      240,
      109,
      defEl,
      [
        {
          x2: 300,
          y2: 109,
          toEl: mockEl({ left: 280, right: 320, top: 104, bottom: 114 }, { lineRect }),
        },
        {
          x2: 360,
          y2: 109,
          toEl: mockEl({ left: 340, right: 380, top: 104, bottom: 114 }, { lineRect }),
        },
      ],
      SVG_BOX,
    );
    const firstCubic = paths[0]!.match(/C ([\d.-]+) ([\d.-]+),/);
    expect(firstCubic).toBeTruthy();
    expect(Number(firstCubic![1])).toBeLessThan(240);
  });
});

describe("roundedPolylinePath", () => {
  it("fillet corners with quadratic segments", () => {
    const path = roundedPolylinePath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      6,
    );
    expect(path).toMatch(/^M 0 0/);
    expect(path).toMatch(/Q 0 50/);
    expect(path).toMatch(/100 50$/);
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

  it("returns rounded orthogonal paths for typesetting wires", () => {
    const path = previewWirePath({
      connectionKind: "typesetting",
      x1: 40,
      y1: 100,
      x2: 200,
      y2: 180,
      fromSide: "right",
      toSide: "left",
      fromEl: null,
      toEl: null,
      svgBox: SVG_BOX,
    });
    expect(path).toMatch(/^M /);
    expect(path).toMatch(/Q /);
    expect(path).not.toMatch(/C /);
  });

  it("typesetting on one signature line routes above the text", () => {
    const lineRect = { left: 80, top: 100, right: 400, bottom: 118 };
    const from = mockEl(
      { left: 280, top: 104, right: 380, bottom: 114 },
      { lineRect },
    );
    const to = mockEl(
      { left: 100, top: 104, right: 140, bottom: 114 },
      { lineRect },
    );
    const path = previewWirePath({
      connectionKind: "typesetting",
      x1: 389,
      y1: 109,
      x2: 91,
      y2: 109,
      fromSide: "right",
      toSide: "left",
      fromEl: from,
      toEl: to,
      svgBox: SVG_BOX,
    });
    const nums = path.match(/-?[\d.]+/g)!.map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeLessThan(100);
    expect(path).toMatch(/\b92\b/);
  });

  it("typesetting on header signature row routes above chip tops", () => {
    const from = mockEl({ left: 220, top: 48, right: 360, bottom: 64 });
    const to = mockEl({ left: 40, top: 48, right: 90, bottom: 64 });
    const path = previewWirePath({
      connectionKind: "typesetting",
      x1: 360,
      y1: 56,
      x2: 40,
      y2: 56,
      fromSide: "right",
      toSide: "left",
      fromEl: from,
      toEl: to,
      svgBox: SVG_BOX,
    });
    const nums = path.match(/-?[\d.]+/g)!.map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeLessThan(48);
  });

  it("usage wires stay cubic even when leaving a signature line", () => {
    const sigLineRect = { left: 80, top: 100, right: 400, bottom: 118 };
    const from = mockEl(
      { left: 100, top: 104, right: 140, bottom: 114 },
      { lineRect: sigLineRect },
    );
    const to = mockEl(
      { left: 120, top: 130, right: 160, bottom: 148 },
      { lineRect: { left: 80, top: 128, right: 400, bottom: 146 } },
    );
    const path = previewWirePath({
      connectionKind: "usage",
      x1: 105,
      y1: 109,
      x2: 125,
      y2: 139,
      fromSide: "left",
      toSide: "left",
      fromEl: from,
      toEl: to,
      svgBox: SVG_BOX,
    });
    expect(path).toMatch(/^M .+ C .+, .+, .+$/);
    expect(path).not.toMatch(/Q /);
  });

  it("branchJunctionPoint returns bus fork coordinates", () => {
    const fromEl = mockEl({ left: 100, top: 80, right: 160, bottom: 96 }, {
      lineRect: { left: 80, top: 80, right: 400, bottom: 96 },
    });
    const spurEl = mockEl({ left: 220, top: 140, right: 280, bottom: 156 });

    const junction = branchJunctionPoint(
      150,
      88,
      fromEl,
      [{ x2: 220, y2: 148, toEl: spurEl }],
      SVG_BOX,
    );

    expect(junction).not.toBeNull();
    expect(junction!.x).toBeGreaterThan(150);
    expect(junction!.y).toBeGreaterThan(88);
  });
});
