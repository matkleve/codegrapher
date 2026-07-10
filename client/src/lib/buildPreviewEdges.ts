import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { GraphVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export function buildUsagePreviewEdge(
  edgeId: string,
  target: GraphVisibleTarget,
  usageEl: HTMLElement,
): PreviewEdgeSpec {
  const from =
    target.definitionEl?.isConnected
      ? { type: "element" as const, el: target.definitionEl }
      : { type: "handle" as const, handle: target.targetHandle };

  return {
    id: edgeId,
    from,
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

export function buildElementPreviewEdge(
  edgeId: string,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  kind: SemanticTokenKind,
): PreviewEdgeSpec {
  return {
    id: edgeId,
    from: { type: "element", el: fromEl },
    to: { type: "element", el: toEl },
    kind,
  };
}
