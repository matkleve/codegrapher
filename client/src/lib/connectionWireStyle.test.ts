import { describe, expect, it } from "vitest";
import {
  computeActiveConnectionKinds,
  computePulsingConnectionKinds,
  legendSwatchClasses,
  previewWireClasses,
  previewWireMarkerEnd,
  previewWireMarkerStart,
  previewWireStroke,
  structuralWireClasses,
  wireStyleForKind,
} from "@/lib/connectionWireStyle";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";

function previewEdge(
  overrides: Partial<PreviewEdgeSpec> & Pick<PreviewEdgeSpec, "id">,
): PreviewEdgeSpec {
  return {
    from: { type: "handle", handle: "a" },
    to: { type: "handle", handle: "b" },
    kind: "function",
    ...overrides,
  };
}

function structuralEdge(
  overrides: Partial<StructuralEdgeSpec> & Pick<StructuralEdgeSpec, "id" | "edgeType">,
): StructuralEdgeSpec {
  return {
    from: { type: "handle", handle: "a" },
    to: { type: "handle", handle: "b" },
    strokeStyle: "solid",
    arrowhead: "triangle-hollow",
    ...overrides,
  };
}

describe("connectionWireStyle", () => {
  it("maps live preview + structural wires to active legend kinds", () => {
    const active = computeActiveConnectionKinds(
      [
        previewEdge({ id: "u", connectionKind: "usage" }),
        previewEdge({ id: "b", connectionKind: "binding" }),
        previewEdge({ id: "s", connectionKind: "typesetting", hop: 2 }),
        previewEdge({ id: "t", hop: 2, connectionKind: "transitive" }),
      ],
      [structuralEdge({ id: "e", edgeType: "extends" })],
      [],
    );

    expect([...active].sort()).toEqual(
      ["binding", "inheritance", "typesetting", "usage"].sort(),
    );
  });

  it("tracks simulation pulse kinds separately", () => {
    const pulsing = computePulsingConnectionKinds([
      structuralEdge({
        id: "p",
        edgeType: "implements",
        strokeStyle: "dotted",
        pulse: true,
      }),
    ]);

    expect([...pulsing]).toEqual(["implementation"]);
  });

  it("legend swatches always use warm preview motion at map speeds", () => {
    expect(legendSwatchClasses("binding", { pulse: false })).toEqual([
      "preview-edge-path",
      "preview-edge-binding",
      "connection-legend-swatch-line--animated",
      "preview-edge-warm",
    ]);
    expect(legendSwatchClasses("typesetting", { pulse: false })).toEqual([
      "preview-edge-path",
      "preview-edge-typesetting",
      "connection-legend-swatch-line--animated",
      "preview-edge-warm",
    ]);
    expect(legendSwatchClasses("inheritance", { pulse: false })).toEqual([
      "structural-edge-path",
      "structural-edge-path--solid",
      "connection-legend-swatch-line--animated",
      "connection-legend-swatch-line--solid-legend",
    ]);
    expect(legendSwatchClasses("implementation", { pulse: false })).toEqual([
      "structural-edge-path",
      "structural-edge-path--dotted",
      "connection-legend-swatch-line--animated",
      "connection-legend-swatch-line--dotted-flow",
    ]);
  });

  it("structural wires reuse legend path classes from the registry", () => {
    expect(
      structuralWireClasses(
        structuralEdge({ id: "e", edgeType: "extends", strokeStyle: "solid" }),
      ),
    ).toEqual(["structural-edge-path", "structural-edge-path--solid"]);
  });

  it("previewWireStroke uses dedicated hues per connection kind", () => {
    expect(
      previewWireStroke(previewEdge({ id: "u", kind: "class", connectionKind: "usage" })),
    ).toBe("var(--edge-usage)");
    expect(
      previewWireStroke(previewEdge({ id: "t", kind: "class", hop: 2 })),
    ).toBe("var(--edge-usage)");
    expect(
      previewWireStroke(previewEdge({ id: "b", connectionKind: "binding" })),
    ).toBe("var(--edge-binding)");
    expect(
      previewWireStroke(
        previewEdge({ id: "s", connectionKind: "typesetting", hop: 2 }),
      ),
    ).toBe("var(--edge-typesetting)");
  });

  it("previewWireClasses includes warm motion on typesetting edges", () => {
    const edge = previewEdge({ id: "x", connectionKind: "typesetting", hop: 2 });
    expect(previewWireClasses(edge, true)).toEqual({
      path: [
        "preview-edge-path",
        "preview-edge-typesetting",
        "preview-edge-warm",
        "preview-wire--hop2",
      ],
      glow: [
        "preview-edge-glow",
        "preview-edge-typesetting",
        "preview-edge-warm",
        "preview-wire--hop2",
      ],
    });
  });

  it("previewWireClasses adds branch trunk class on fan index zero", () => {
    const edge = previewEdge({
      id: "x",
      connectionKind: "branch",
      branchFan: { index: 0, count: 2 },
    });
    expect(previewWireClasses(edge, true).path).toContain(
      "preview-edge-branch-trunk",
    );
  });

  it("previewWireMarkerEnd and Start follow connection kind", () => {
    expect(
      previewWireMarkerEnd(previewEdge({ id: "b", connectionKind: "binding" })),
    ).toBe("wire-arrow-bar");
    expect(
      previewWireMarkerEnd(
        previewEdge({ id: "s", connectionKind: "typesetting" }),
      ),
    ).toBe("wire-bracket-end");
    expect(
      previewWireMarkerStart(
        previewEdge({ id: "s", connectionKind: "typesetting" }),
      ),
    ).toBe("wire-bracket-start");
  });

  it("typesetting legend swatch uses rounded orthogonal path", () => {
    expect(wireStyleForKind("typesetting").legendPathD).toMatch(/Q /);
  });

  it("previewWireClasses matches warm binding edges", () => {
    const edge = previewEdge({ id: "x", connectionKind: "binding" });
    expect(previewWireClasses(edge, true)).toEqual({
      path: ["preview-edge-path", "preview-edge-binding", "preview-edge-warm"],
      glow: ["preview-edge-glow", "preview-edge-binding", "preview-edge-warm"],
    });
  });
});
