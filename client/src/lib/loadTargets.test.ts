import { describe, expect, it } from "vitest";
import {
  filterLoadTargets,
  fromExternalCards,
  fromTokenReferences,
  LOAD_PICKER_SEARCH_THRESHOLD,
  sortLoadTargets,
  type LoadTargetItem,
} from "@/lib/loadTargets";

describe("loadTargets", () => {
  const targets: LoadTargetItem[] = [
    {
      filePath: "/proj/other/Far.ts",
      line: 1,
      label: "sym",
      subtitle: "/proj/other",
    },
    {
      filePath: "/proj/src/Near.ts",
      line: 10,
      label: "sym",
      subtitle: "/proj/src",
    },
    {
      filePath: "/proj/src/AlsoNear.ts",
      line: 3,
      label: "sym",
      subtitle: "/proj/src",
    },
  ];

  it("sorts same-folder targets before distant files", () => {
    const sorted = sortLoadTargets(targets, "/proj/src/Caller.ts");
    expect(sorted[0]!.filePath).toContain("/proj/src/");
    expect(sorted.at(-1)!.filePath).toContain("/proj/other/");
  });

  it("filters by filename, path, and label", () => {
    const filtered = filterLoadTargets(targets, "near");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((t) => t.filePath.toLowerCase().includes("near"))).toBe(
      true,
    );
  });

  it("returns all targets for blank query", () => {
    expect(filterLoadTargets(targets, "   ")).toHaveLength(3);
  });

  it("maps external cards to picker rows", () => {
    const rows = fromExternalCards([
      {
        symbolName: "charge",
        filePath: "/a/Payment.ts",
        line: 4,
        occurrenceCount: 2,
      },
    ]);
    expect(rows[0]).toMatchObject({
      filePath: "/a/Payment.ts",
      line: 4,
      label: "charge",
    });
  });

  it("maps token references to picker rows", () => {
    const rows = fromTokenReferences([
      {
        filePath: "/a/Svc.ts",
        line: 2,
        classLabel: "OrderService",
        memberLabel: "checkout",
        kind: "function",
        inGraph: false,
      },
    ]);
    expect(rows[0]?.label).toBe("OrderService.checkout");
    expect(rows[0]?.subtitle).toBe("/a");
  });

  it("filters by subtitle directory", () => {
    const filtered = filterLoadTargets(targets, "/proj/src");
    expect(filtered).toHaveLength(2);
  });

  it("sort is stable for same-folder ties by filename", () => {
    const sameFolder: LoadTargetItem[] = [
      { filePath: "/p/Z.ts", line: 1, label: "a", subtitle: "/p" },
      { filePath: "/p/A.ts", line: 1, label: "b", subtitle: "/p" },
    ];
    const sorted = sortLoadTargets(sameFolder, "/p/Caller.ts");
    expect(sorted[0]!.filePath).toContain("A.ts");
  });

  it("filters 200 targets quickly", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      filePath: `/repo/pkg/file-${i}.ts`,
      line: i,
      label: `sym${i}`,
      subtitle: "/repo/pkg",
    }));
    const start = performance.now();
    const out = filterLoadTargets(many, "file-199");
    const elapsed = performance.now() - start;
    expect(out).toHaveLength(1);
    expect(elapsed).toBeLessThan(50);
  });

  it("exposes search threshold above single-digit lists", () => {
    expect(LOAD_PICKER_SEARCH_THRESHOLD).toBeGreaterThan(5);
  });
});
