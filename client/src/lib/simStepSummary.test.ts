import { describe, expect, it } from "vitest";
import { formatStepDelta, simTickMetrics } from "@/lib/simStepSummary";
import type { SimStep } from "@/lib/staticWalk/types";

const BASE_STEP: SimStep = {
  lineNumber: 1,
  text: "const x = 1;",
  kind: "declaration",
  scopeSnapshot: new Map(),
  detail: { reads: [], writes: [], calculated: [], notes: [] },
};

describe("formatStepDelta", () => {
  it("prefers writes", () => {
    const step: SimStep = {
      ...BASE_STEP,
      detail: {
        ...BASE_STEP.detail,
        writes: [{ name: "x", before: { display: "0", kind: "literal" }, after: { display: "1", kind: "literal" } }],
      },
    };
    expect(formatStepDelta(step)).toBe("Δ x: 0→1");
  });
});

describe("simTickMetrics", () => {
  it("shrinks ticks for large step counts", () => {
    expect(simTickMetrics(10).sizePx).toBeGreaterThan(simTickMetrics(100).sizePx);
  });
});
