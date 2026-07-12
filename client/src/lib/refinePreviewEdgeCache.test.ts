import { describe, expect, it } from "vitest";
import { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

function edge(id: string): PreviewEdgeSpec {
  return {
    id,
    from: { type: "handle", handle: `from-${id}` },
    to: { type: "handle", handle: `to-${id}` },
    kind: "variable",
  };
}

describe("refinePreviewEdgeCache", () => {
  it("returns the same refined anchors for the same edge id", () => {
    const cache = createRefinePreviewEdgeCache();
    const getNode = () => undefined;
    const a = cache.refine(edge("e1"), getNode);
    const b = cache.refine(edge("e1"), getNode);
    expect(a).toBe(b);
  });
});
