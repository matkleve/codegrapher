import { liveFromDefEl } from "@/lib/buildPreviewEdges";
import { buildLocalPreviewEdges } from "@/lib/localDefLinks";
import { areMemberDefSiblingHosts } from "@/lib/memberDefAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  resolveDefinitionUsageSites,
  type DefinitionEdgeContext,
} from "@/lib/resolveDefinitionUsageSites";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import type { SemanticTokenKind } from "@/lib/tokenColors";

function isRealUsageSite(
  definitionEl: HTMLElement,
  anchor: PreviewEdgeSpec["to"],
): boolean {
  if (anchor.type !== "element") return true;
  if (anchor.el === definitionEl) return false;
  return !areMemberDefSiblingHosts(definitionEl, anchor.el);
}

/**
 * Def → usage preview wires for a hovered/pinned definition chip.
 * Off-canvas call sites are listed in the connection menu only — not as self-loop load wires.
 */
export function buildDefinitionPreviewEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
  context?: DefinitionEdgeContext,
): PreviewEdgeSpec[] {
  const local = buildLocalPreviewEdges(definitionEl, kind, `local-def-${token}`);
  if (local.length > 0) return local;

  const sites = (
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
        }))
  ).filter((site) => isRealUsageSite(definitionEl, site.anchor));

  return sites.map((site, index) => ({
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
}
