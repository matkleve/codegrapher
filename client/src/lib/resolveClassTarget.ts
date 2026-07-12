import { previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { findClassDefLabel } from "@/lib/liveAnchorFinders";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphVisibleTarget } from "@/lib/resolveVisibleTargetTypes";

export function buildClassGraphTarget(
  token: string,
  kind: SemanticTokenKind,
  flowNodeId: string,
  classLabel: string,
): GraphVisibleTarget {
  const definitionEl = findClassDefLabel(flowNodeId, token);
  return {
    mode: "graph",
    level: "class",
    flowNodeId,
    targetHandle: previewTargetTop(flowNodeId),
    definitionEl: definitionEl ?? undefined,
    label: classLabel,
    kind,
  };
}
