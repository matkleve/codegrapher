import { describe, expect, it } from "vitest";
import {
  connectionCountLabel,
  enrichCallSites,
  offCanvasCallSiteFiles,
  projectReferencesForToken,
} from "@/lib/projectReferences";

describe("projectReferences", () => {
  const refs = new Map([
    [
      "charge",
      [
        { filePath: "/proj/OrderService.ts", line: 15 },
        { filePath: "/proj/Checkout.ts", line: 4 },
        { filePath: "/proj/Checkout.ts", line: 9 },
      ],
    ],
  ]);

  it("returns references for a symbol", () => {
    expect(projectReferencesForToken(refs, "charge")).toHaveLength(3);
    expect(projectReferencesForToken(refs, "missing")).toHaveLength(0);
  });

  it("marks in-graph files", () => {
    const enriched = enrichCallSites(projectReferencesForToken(refs, "charge"), new Set([
      "/proj/OrderService.ts",
    ]));
    expect(enriched.filter((r) => r.inGraph)).toHaveLength(1);
  });

  it("dedupes off-canvas files for load picker", () => {
    const off = offCanvasCallSiteFiles(
      projectReferencesForToken(refs, "charge"),
      new Set(["/proj/OrderService.ts"]),
    );
    expect(off).toHaveLength(1);
    expect(off[0]!.filePath).toContain("Checkout.ts");
    expect(off[0]!.line).toBe(4);
  });

  it("formats honest connection labels", () => {
    expect(connectionCountLabel({ onCanvas: 0, inProject: 5 })).toBe(
      "5 call sites in project",
    );
    expect(connectionCountLabel({ onCanvas: 2, inProject: 7 })).toBe(
      "2 on canvas · 7 in project",
    );
  });
});
