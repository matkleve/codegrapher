import type { SimStep } from "@/lib/staticWalk/types";

/** One-line Δ summary for collapsed ledger rows. */
export function formatStepDelta(step: SimStep): string {
  const { writes, calculated, reads } = step.detail;
  if (writes.length > 0) {
    return writes.map((w) => `Δ ${w.name}: ${w.before.display}→${w.after.display}`).join(", ");
  }
  if (calculated.length > 0) {
    return calculated.map((c) => `${c.name} ← ${c.result.display}`).join(", ");
  }
  if (reads.length > 0) {
    return reads.map((r) => `${r.name}=${r.value.display}`).join(", ");
  }
  if (step.detail.flow?.targetLabel) {
    return `→ ${step.detail.flow.targetLabel}`;
  }
  return "";
}

/** Compact tick geometry — shrinks as step count grows. */
export function simTickMetrics(stepCount: number): { sizePx: number; gapPx: number } {
  if (stepCount > 80) return { sizePx: 3, gapPx: 1 };
  if (stepCount > 40) return { sizePx: 4, gapPx: 1 };
  if (stepCount > 20) return { sizePx: 5, gapPx: 2 };
  return { sizePx: 6, gapPx: 2 };
}
