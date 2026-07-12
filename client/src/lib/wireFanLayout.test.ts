import { describe, expect, it } from "vitest";
import {
  buildWireLayoutContext,
  FAN_TARGET_Y_SPAN,
  partitionFanClusters,
  resetWireLayoutCache,
} from "@/lib/wireFanLayout";
import { layoutCubicFanPaths } from "@/lib/wirePaths";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

const SVG_BOX = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;

function mockEl(rect: DOMRectInit, opts?: { lineRect?: DOMRectInit }): HTMLElement {
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
    closest: (selector: string) => {
      if (selector === ".code-line" && opts?.lineRect) {
        return {
          isConnected: true,
          getBoundingClientRect: () => ({
            left: opts.lineRect!.left ?? 0,
            top: opts.lineRect!.top ?? 0,
            right: opts.lineRect!.right ?? 0,
            bottom: opts.lineRect!.bottom ?? 0,
            width: (opts.lineRect!.right ?? 0) - (opts.lineRect!.left ?? 0),
            height: (opts.lineRect!.bottom ?? 0) - (opts.lineRect!.top ?? 0),
            toJSON: () => ({}),
          }),
        };
      }
      if (selector === "[data-member-id]") {
        return { getAttribute: () => "m1" };
      }
      if (selector === "[data-flow-node-id]") {
        return { getAttribute: () => "node-a" };
      }
      return null;
    },
    querySelector: () => null,
    dataset: {},
  } as HTMLElement;
}

describe("layoutCubicFanPaths", () => {
  it("builds a shared trunk and cubic spurs for clustered targets", () => {
    const defEl = mockEl({ left: 200, right: 280, top: 100, bottom: 118 });
    const { paths } = layoutCubicFanPaths(
      240,
      109,
      defEl,
      [
        { x2: 420, y2: 130, toEl: mockEl({ left: 400, right: 440, top: 122, bottom: 138 }) },
        { x2: 420, y2: 170, toEl: mockEl({ left: 400, right: 440, top: 162, bottom: 178 }) },
      ],
      SVG_BOX,
    );
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatch(/C .+ C /);
    expect(paths[1]).toMatch(/^M .+ C /);
  });
});

describe("buildWireLayoutContext", () => {
  it("fans def hover wires when targets cluster vertically", () => {
    resetWireLayoutCache();
    const defEl = mockEl({ left: 200, right: 280, top: 100, bottom: 118 });
    const useA = mockEl({ left: 400, right: 460, top: 120, bottom: 138 });
    const useB = mockEl({ left: 400, right: 460, top: 160, bottom: 178 });

    const specs: PreviewEdgeSpec[] = [
      {
        id: "def-a-0",
        from: { type: "element", el: defEl },
        to: { type: "element", el: useA },
        kind: "function",
        connectionKind: "usage",
      },
      {
        id: "def-a-1",
        from: { type: "element", el: defEl },
        to: { type: "element", el: useB },
        kind: "function",
        connectionKind: "usage",
      },
    ];

    const ctx = buildWireLayoutContext(specs, SVG_BOX, () => undefined);
    expect(ctx.fanMembers.size).toBe(2);
    expect(ctx.fanMembers.get("def-a-0")?.drawTrunkClass).toBe(true);
    expect(ctx.fanMembers.get("def-a-0")?.junction).not.toBeNull();
    expect(ctx.fanMembers.get("def-a-1")?.junction).toBeNull();
  });

  it("skips fan when targets are too far apart vertically", () => {
    resetWireLayoutCache();
    const defEl = mockEl({ left: 200, right: 280, top: 100, bottom: 118 });
    const specs: PreviewEdgeSpec[] = [
      {
        id: "def-far-0",
        from: { type: "element", el: defEl },
        to: { type: "element", el: mockEl({ left: 400, right: 460, top: 120, bottom: 138 }) },
        kind: "function",
      },
      {
        id: "def-far-1",
        from: { type: "element", el: defEl },
        to: {
          type: "element",
          el: mockEl({
            left: 400,
            right: 460,
            top: 120 + FAN_TARGET_Y_SPAN + 20,
            bottom: 138 + FAN_TARGET_Y_SPAN + 20,
          }),
        },
        kind: "function",
      },
    ];

    const ctx = buildWireLayoutContext(specs, SVG_BOX, () => undefined);
    expect(ctx.fanMembers.size).toBe(0);
  });

  it("sub-clusters same-line usages when an outlier exceeds Y span", () => {
    resetWireLayoutCache();
    const defEl = mockEl({ left: 200, right: 280, top: 100, bottom: 118 });
    const ifUse = mockEl({ left: 360, right: 400, top: 118, bottom: 136 });
    const returnY = 118 + FAN_TARGET_Y_SPAN + 40;
    const cityUse = mockEl({ left: 400, right: 440, top: returnY, bottom: returnY + 18 });
    const townUse = mockEl({ left: 480, right: 520, top: returnY, bottom: returnY + 18 });
    const vilUse = mockEl({ left: 560, right: 600, top: returnY, bottom: returnY + 18 });

    const specs: PreviewEdgeSpec[] = [
      {
        id: "addr-if",
        from: { type: "element", el: defEl },
        to: { type: "element", el: ifUse },
        kind: "variable",
      },
      {
        id: "addr-city",
        from: { type: "element", el: defEl },
        to: { type: "element", el: cityUse },
        kind: "variable",
      },
      {
        id: "addr-town",
        from: { type: "element", el: defEl },
        to: { type: "element", el: townUse },
        kind: "variable",
      },
      {
        id: "addr-vil",
        from: { type: "element", el: defEl },
        to: { type: "element", el: vilUse },
        kind: "variable",
      },
    ];

    const resolved = specs.map((spec) => ({
      spec,
      fromPt: { x: 240, y: 109, el: defEl },
      toPt: {
        x: spec.to.type === "element" ? spec.to.el.getBoundingClientRect().left + 10 : 0,
        y:
          spec.to.type === "element"
            ? spec.to.el.getBoundingClientRect().top + 9
            : 0,
        el: spec.to.type === "element" ? spec.to.el : null,
      },
    }));

    const clusters = partitionFanClusters(resolved);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.map((w) => w.spec.id)).toEqual([
      "addr-city",
      "addr-town",
      "addr-vil",
    ]);

    const ctx = buildWireLayoutContext(specs, SVG_BOX, () => undefined);
    expect(ctx.fanMembers.size).toBe(3);
    expect(ctx.fanMembers.get("addr-city")?.drawTrunkClass).toBe(true);
    expect(ctx.fanMembers.get("addr-city")?.junction).not.toBeNull();
    expect(ctx.fanMembers.get("addr-town")?.junction).toBeNull();
    expect(ctx.fanMembers.get("addr-vil")?.junction).toBeNull();
    expect(ctx.fanMembers.has("addr-if")).toBe(false);
  });
});
