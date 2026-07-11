import { describe, expect, it } from "vitest";
import { buildSignatureTypeUsageEdges } from "@/lib/linksForElement";
import type { SymbolEntry } from "@/types";

describe("buildSignatureTypeUsageEdges", () => {
  it("builds a Load stub from index cards when graph resolution fails", () => {
    const usageEl = document.createElement("span");
    usageEl.dataset.traceKey = "flow-a::member-1::sig-type::AddressFieldKind";

    const symbols = new Map<string, SymbolEntry[]>([
      [
        "AddressFieldKind",
        [{ filePath: "/proj/types.ts", kind: "type", line: 4 }],
      ],
    ]);

    const edges = buildSignatureTypeUsageEdges(
      "AddressFieldKind",
      "type",
      usageEl,
      symbols,
      null,
      () => undefined,
      "flow-a",
      "member-1",
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.load?.filePath).toBe("/proj/types.ts");
    expect(edges[0]?.liveTo?.traceKey).toBe(
      "flow-a::member-1::sig-type::AddressFieldKind",
    );
  });
});
