import type { SimStep, SimValueKind } from "@/lib/staticWalk/types";

export type InlineValue = {
  name: string;
  display: string;
  kind: SimValueKind;
};

/**
 * End-of-line value annotations for the current sim step — "what this line
 * computed" (VS Code inline-value style). Prefers `calculated` (binding ←
 * result); falls back to `writes` (name → after) for plain assignments.
 * See docs/specs/system/execution-simulator.canvas-values.supplement.md (C1).
 */
export function inlineValuesForStep(step: SimStep): InlineValue[] {
  const { calculated, writes } = step.detail;
  if (calculated.length > 0) {
    return calculated.map((c) => ({
      name: c.name,
      display: c.result.display,
      kind: c.result.kind,
    }));
  }
  return writes.map((w) => ({
    name: w.name,
    display: w.after.display,
    kind: w.after.kind,
  }));
}
