import { describe, expect, it } from "vitest";
import { mergePreviewEdgesByStrength } from "@/lib/wireHoverBoost";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

function edge(id: string, hop?: number): PreviewEdgeSpec {
  return {
    id,
    kind: "variable",
    from: { type: "handle", handle: "a" },
    to: { type: "handle", handle: "b" },
    hop,
  };
}

describe("mergePreviewEdgesByStrength", () => {
  it("keeps the closer hop when pin and hover share an edge id", () => {
    const merged = mergePreviewEdgesByStrength(
      [edge("wire-1", 2)],
      [edge("wire-1", undefined)],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.hop).toBeUndefined();
  });
});
