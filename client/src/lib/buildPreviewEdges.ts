import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { GraphVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export function buildUsagePreviewEdge(
  edgeId: string,
  target: GraphVisibleTarget,
  usageEl: HTMLElement,
): PreviewEdgeSpec {
  return {
    id: edgeId,
    from: { type: "handle", handle: target.targetHandle },
    to: { type: "element", el: usageEl },
    kind: target.kind,
  };
}

export function buildDefinitionFanOutEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
  usageEls: HTMLElement[],
): PreviewEdgeSpec[] {
  return usageEls.map((usageEl, index) => ({
    id: `def-${token}-${index}`,
    from: { type: "element", el: definitionEl },
    to: { type: "element", el: usageEl },
    kind,
  }));
}
