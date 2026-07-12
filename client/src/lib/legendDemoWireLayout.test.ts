import { describe, expect, it } from "vitest";
import { layoutLegendDemoWires } from "@/lib/legendDemoWireLayout";
import type { DemoWireSpec } from "@/hooks/useLegendDemoWire";

const SVG_BOX = { left: 0, top: 0, width: 320, height: 240 } as DOMRect;

function mockEl(
  rect: { left: number; right: number; top: number; bottom: number },
  opts?: { lineRect?: { left: number; right: number; top: number; bottom: number } },
): HTMLElement {
  const el = document.createElement("button");
  el.dataset.demoAnchor = "x";
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect;

  if (opts?.lineRect) {
    const line = document.createElement("div");
    line.className = "code-line";
    line.getBoundingClientRect = () =>
      ({
        ...opts.lineRect!,
        width: opts.lineRect!.right - opts.lineRect!.left,
        height: opts.lineRect!.bottom - opts.lineRect!.top,
        x: opts.lineRect!.left,
        y: opts.lineRect!.top,
        toJSON: () => ({}),
      }) as DOMRect;
    line.append(el);
    return el;
  }

  return el;
}

function mountBranchDemo(): {
  root: HTMLElement;
  spec: DemoWireSpec;
} {
  const root = document.createElement("div");
  const trunk = mockEl(
    { left: 108, right: 138, top: 40, bottom: 54 },
    { lineRect: { left: 24, right: 280, top: 38, bottom: 56 } },
  );
  trunk.dataset.demoAnchor = "trunk";
  const caseA = mockEl({ left: 48, right: 78, top: 62, bottom: 76 });
  caseA.dataset.demoAnchor = "caseA";
  const caseB = mockEl({ left: 48, right: 78, top: 82, bottom: 96 });
  caseB.dataset.demoAnchor = "caseB";

  root.append(trunk, caseA, caseB);
  document.body.append(root);

  return {
    root,
    spec: {
      mode: "branch",
      from: { id: "trunk", fromSide: "right" },
      to: [
        { id: "caseA", toSide: "left" },
        { id: "caseB", toSide: "left" },
      ],
    },
  };
}

describe("layoutLegendDemoWires", () => {
  it("uses the shared branch fan layout for control-flow demos", () => {
    const { root, spec } = mountBranchDemo();
    try {
      const { paths, junction } = layoutLegendDemoWires(spec, root, SVG_BOX);

      expect(paths).toHaveLength(2);
      expect(paths[0]).toMatch(/L 12 \d+/);
      expect(paths[0]).not.toMatch(/C /);
      expect(junction?.x).toBe(12);
    } finally {
      root.remove();
    }
  });

  it("returns empty paths when anchors are missing", () => {
    const root = document.createElement("div");
    const spec: DemoWireSpec = {
      mode: "preview",
      kind: "usage",
      from: { id: "missing-from" },
      to: { id: "missing-to" },
    };

    expect(layoutLegendDemoWires(spec, root, SVG_BOX)).toEqual({
      paths: [],
      junction: null,
    });
  });
});
