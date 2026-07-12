import { describe, expect, it } from "vitest";
import {
  filterPreviewEdgesByVisibility,
  previewConnectionKind,
} from "@/lib/connectionVisibility";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

function edge(
  overrides: Partial<PreviewEdgeSpec> = {},
): PreviewEdgeSpec {
  return {
    id: "e",
    from: { type: "handle", handle: "a" },
    to: { type: "handle", handle: "b" },
    kind: "variable",
    ...overrides,
  };
}

describe("filterPreviewEdgesByVisibility", () => {
  it("filters usage and binding independently", () => {
    const edges = [
      edge({ id: "u" }),
      edge({ id: "b", connectionKind: "binding" }),
      edge({ id: "s", connectionKind: "typesetting", hop: 2 }),
      edge({ id: "t", hop: 2, connectionKind: "transitive" }),
    ];

    expect(
      filterPreviewEdgesByVisibility(edges, new Set(["usage"])).map((e) => e.id),
    ).toEqual(["u", "t"]);

    expect(
      filterPreviewEdgesByVisibility(edges, new Set(["binding"])).map((e) => e.id),
    ).toEqual(["b"]);

    expect(
      filterPreviewEdgesByVisibility(edges, new Set(["typesetting"])).map((e) => e.id),
    ).toEqual(["s"]);

    expect(
      filterPreviewEdgesByVisibility(edges, new Set(["inheritance"])).map((e) => e.id),
    ).toEqual([]);
  });

  it("classifies connectionKind on preview edges", () => {
    expect(previewConnectionKind(edge({ connectionKind: "transitive" }))).toBe("transitive");
    expect(previewConnectionKind(edge())).toBe("usage");
  });
});
