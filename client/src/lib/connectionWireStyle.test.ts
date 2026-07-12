import { describe, expect, it } from "vitest";
import {
  computeActiveConnectionKinds,
  computePulsingConnectionKinds,
  legendSwatchClasses,
  previewWireClasses,
  previewWireStroke,
  structuralWireClasses,
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
        previewEdge({ id: "t", hop: 2, connectionKind: "transitive" }),
      ],
      [structuralEdge({ id: "e", edgeType: "extends" })],
      [],
    );

    expect([...active].sort()).toEqual(
      ["binding", "inheritance", "usage"].sort(),
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
      "preview-edge-warm",
    ]);
    expect(legendSwatchClasses("implementation", { pulse: false })).toEqual([
      "structural-edge-path",
      "structural-edge-path--dotted",
      "connection-legend-swatch-line--dotted-flow",
    ]);
    expect(legendSwatchClasses("inheritance", { pulse: false })).toEqual([
      "structural-edge-path",
      "structural-edge-path--solid",
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
  });

  it("previewWireClasses matches warm binding edges", () => {
    const edge = previewEdge({ id: "x", connectionKind: "binding" });
    expect(previewWireClasses(edge, true)).toEqual({
      path: ["preview-edge-path", "preview-edge-binding", "preview-edge-warm"],
      glow: ["preview-edge-glow", "preview-edge-binding", "preview-edge-warm"],
    });
  });
});
