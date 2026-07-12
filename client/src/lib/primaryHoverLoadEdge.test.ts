import { describe, expect, it } from "vitest";
import { buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { primaryHoverLoadEdge } from "@/lib/primaryHoverLoadEdge";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

function loadEdge(hop?: number): PreviewEdgeSpec {
  const chip = document.createElement("span");
  const other = document.createElement("span");
  return {
    ...buildLoadPreviewEdge("load", [{ filePath: "/a.ts", line: 1 }], chip, "Foo", "type"),
    from: { type: "element", el: chip },
    to: { type: "element", el: chip },
    ...(hop != null ? { hop } : {}),
  };
}

describe("primaryHoverLoadEdge", () => {
  it("returns tier-1 load stub anchored on the hovered chip", () => {
    const chip = document.createElement("span");
    const edge = loadEdge();
    edge.from = { type: "element", el: chip };

    expect(primaryHoverLoadEdge([edge], chip)).toBe(edge);
  });

  it("ignores cascaded hop-3 load stubs", () => {
    const chip = document.createElement("span");
    const edge = loadEdge(3);
    edge.from = { type: "element", el: chip };

    expect(primaryHoverLoadEdge([edge], chip)).toBeUndefined();
  });

  it("ignores load stubs anchored on a different element", () => {
    const chip = document.createElement("span");
    const edge = loadEdge();
    expect(primaryHoverLoadEdge([edge], chip)).toBeUndefined();
  });
});
