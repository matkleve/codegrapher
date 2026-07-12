import { TOKEN_EDGE_STROKE, type SemanticTokenKind } from "@/lib/tokenColors";
import type { FlowSubstep } from "@/lib/staticWalk/buildStepFlow";

/**
 * Flow-point colour rule (see canvas-values supplement, "Colours"):
 * - unevaluated/unknown carries → muted (`--faint`).
 * - a literal carried by a plain `fetch` → the source token's own semantic
 *   hue (falls back to `variable` when the anchor has no resolvable kind).
 * - the result point born at `combine`/`assign`/`bind` → the distinct result
 *   hue (`--edge-binding`), already defined in index.css for binding wires.
 */
export function flowPointColor(
  substep: Pick<FlowSubstep, "kind" | "value">,
  sourceSemanticKind?: SemanticTokenKind,
): string {
  if (!substep.value || substep.value.kind !== "literal") return "var(--faint)";
  if (substep.kind === "fetch") {
    return TOKEN_EDGE_STROKE[sourceSemanticKind ?? "variable"];
  }
  return "var(--edge-binding)";
}
