import type { Node } from "@xyflow/react";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SimStep } from "@/lib/staticWalk/types";
import type { GraphData, SymbolEntry } from "@/types";

export function enrichSimSteps(
  steps: SimStep[],
  ownerFlowNodeId: string,
  symbols: SymbolEntry[],
  graphData: GraphData,
  getNode: (id: string) => Node | undefined,
): SimStep[] {
  return steps.map((step) => {
    if (step.kind !== "call" || !step.edgePulse?.token) return step;

    const callee = resolveVisibleTarget(
      step.edgePulse.token,
      symbols,
      graphData,
      getNode,
      ownerFlowNodeId,
    );
    if (callee?.mode !== "graph") return step;

    const crossesClass = callee.flowNodeId !== ownerFlowNodeId;
    const targetLabel = step.detail.flow?.targetLabel ?? callee.label;

    return {
      ...step,
      crossesClass,
      detail: {
        ...step.detail,
        flow: { kind: "call" as const, targetLabel },
      },
    };
  });
}
