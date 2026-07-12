import { describe, expect, it, beforeEach } from "vitest";
import {
  isWireEmphasized,
  mergePreviewEdgesByStrength,
  setHoverPreviewEdgeIds,
  setWireHoveredTokenKey,
} from "@/lib/wireHoverBoost";
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

describe("isWireEmphasized", () => {
  beforeEach(() => {
    setWireHoveredTokenKey(null);
    setHoverPreviewEdgeIds(new Set());
  });

  it("emphasizes all wires in the hover preview overlay", () => {
    setWireHoveredTokenKey("sig::type::AddressFieldKind");
    setHoverPreviewEdgeIds(new Set(["hop-3-wire", "hop-2-wire"]));
    expect(isWireEmphasized(edge("hop-3-wire", 3))).toBe(true);
    expect(isWireEmphasized(edge("anchor-wire", 2))).toBe(false);
  });
});
