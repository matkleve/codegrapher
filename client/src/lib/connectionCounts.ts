import {
  resolveDefinitionUsageSites,
  type DefinitionEdgeContext,
} from "@/lib/resolveDefinitionUsageSites";
import { linksForElement } from "@/lib/localDefLinks";
import type { ConnectionCounts } from "@/lib/projectReferences";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";

export function connectionCountForHost(
  host: HTMLElement,
  symbolName?: string,
  context?: DefinitionEdgeContext,
): number {
  return connectionCountsForHost(host, symbolName, context).onCanvas;
}

export function connectionCountsForHost(
  host: HTMLElement,
  symbolName?: string,
  context?: DefinitionEdgeContext,
): ConnectionCounts {
  const local = linksForElement(host);
  if (local.length > 0) {
    return { onCanvas: local.length, inProject: local.length };
  }
  if (!symbolName) return { onCanvas: 0, inProject: 0 };

  const onCanvas =
    context?.graphData && context.getNode
      ? resolveDefinitionUsageSites(
          symbolName,
          host,
          context.graphData,
          context.getNode,
          context.sourceFlowId,
          context.sourceMemberId,
          context,
        ).length
      : resolveUsageAnchors(symbolName, host).length;

  const inProject = context?.lookupProjectReferences?.(symbolName)?.length ?? onCanvas;
  return { onCanvas, inProject };
}
