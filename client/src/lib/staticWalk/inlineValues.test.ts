import { describe, expect, it } from "vitest";
import { inlineValuesForStep } from "@/lib/staticWalk/inlineValues";
import type { SimStep } from "@/lib/staticWalk/types";

function step(detail: Partial<SimStep["detail"]>): SimStep {
  return {
    lineNumber: 1,
    text: "",
    kind: "declaration",
    scopeSnapshot: new Map(),
    detail: { reads: [], writes: [], calculated: [], notes: [], ...detail },
  };
}

describe("inlineValuesForStep", () => {
  it("prefers calculated (binding ← result)", () => {
    const s = step({
      calculated: [
        { name: "amount", expression: "get(id)", result: { display: "get(id)", kind: "unevaluated" } },
      ],
      writes: [
        { name: "amount", before: { display: "?", kind: "unknown" }, after: { display: "x", kind: "literal" } },
      ],
    });
    expect(inlineValuesForStep(s)).toEqual([
      { name: "amount", display: "get(id)", kind: "unevaluated" },
    ]);
  });

  it("falls back to writes when nothing is calculated", () => {
    const s = step({
      writes: [
        { name: "total", before: { display: "0", kind: "literal" }, after: { display: "5", kind: "literal" } },
      ],
    });
    expect(inlineValuesForStep(s)).toEqual([{ name: "total", display: "5", kind: "literal" }]);
  });

  it("is empty when the step neither calculates nor writes", () => {
    expect(inlineValuesForStep(step({}))).toEqual([]);
  });
});
