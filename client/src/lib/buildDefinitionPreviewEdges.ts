import { buildCallSiteLoadPreviewEdge, liveFromDefEl } from "@/lib/buildPreviewEdges";
import { buildLocalPreviewEdges } from "@/lib/localDefLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  resolveDefinitionUsageSites,
  type DefinitionEdgeContext,
} from "@/lib/resolveDefinitionUsageSites";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import type { SemanticTokenKind } from "@/lib/tokenColors";

function offCanvasLoadCards(
  token: string,
  context: DefinitionEdgeContext | undefined,
) {
  return (context?.lookupOffCanvasCallSiteFiles?.(token) ?? []).map((site) => ({
    symbolName: token,
    filePath: site.filePath,
    line: site.line,
    occurrenceCount: 1,
  }));
}

export function buildDefinitionPreviewEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
  context?: DefinitionEdgeContext,
): PreviewEdgeSpec[] {
  const local = buildLocalPreviewEdges(definitionEl, kind, `local-def-${token}`);
  if (local.length > 0) return local;

  const sites =
    context?.getNode
      ? resolveDefinitionUsageSites(
          token,
          definitionEl,
          context.graphData,
          context.getNode,
          context.sourceFlowId,
          context.sourceMemberId,
          context,
        )
      : resolveUsageAnchors(token, definitionEl).map((el) => ({
          anchor: { type: "element" as const, el },
          liveTo: { token, flowNodeId: context?.sourceFlowId ?? "", role: "usage" as const },
        }));

  const offCanvas = offCanvasLoadCards(token, context);

  if (sites.length === 0) {
    if (offCanvas.length === 0) return [];
    return [
      buildCallSiteLoadPreviewEdge(
        `callsite-load-${token}`,
        offCanvas,
        definitionEl,
        token,
        kind,
      ),
    ];
  }

  const edges = sites.map((site, index) => ({
    id: `def-${token}-${index}`,
    from: { type: "element", el: definitionEl },
    to: site.anchor,
    kind,
    liveFrom: liveFromDefEl(
      token,
      definitionEl,
      context?.sourceFlowId,
      context?.sourceMemberId,
    ),
    liveTo: site.liveTo,
  }));

  if (offCanvas.length > 0) {
    edges.push(
      buildCallSiteLoadPreviewEdge(
        `callsite-load-${token}`,
        offCanvas,
        definitionEl,
        token,
        kind,
      ),
    );
  }

  return edges;
}
