import { describe, expect, it } from "vitest";
import { buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { isDegeneratePreviewEdge } from "@/lib/previewEdgeFilter";

describe("isDegeneratePreviewEdge", () => {
  it("keeps load stubs even when from and to reference the same chip", () => {
    const chip = document.createElement("span");
    const edge = buildLoadPreviewEdge(
      "load",
      [{ filePath: "/a.ts", line: 1 }],
      chip,
      "Foo",
      "type",
    );

    expect(isDegeneratePreviewEdge(edge, () => undefined)).toBe(false);
  });
});
