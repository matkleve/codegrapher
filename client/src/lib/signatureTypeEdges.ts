import {
  buildLoadPreviewEdge,
  buildUsagePreviewEdge,
} from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId } from "@/lib/ctrlPreviewHandles";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  buildExternalReferenceCards,
  resolveVisibleTarget,
} from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphData, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

/** Indexed type name in a method signature tag → definition on canvas or Load stub. */
export function buildSignatureTypeUsageEdges(
  symbolName: string,
  kind: SemanticTokenKind,
  usageEl: HTMLElement,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  memberId: string,
): PreviewEdgeSpec[] {
  const edgeKey = ctrlPreviewEdgeId(
    sourceFlowId,
    `sig-type::${memberId}::${symbolName}`,
  );

  let resolved = resolveVisibleTarget(
    symbolName,
    symbols,
    graphData,
    getNode,
    sourceFlowId,
  );
  if (!resolved) {
    const indexCards = buildExternalReferenceCards(symbolName, symbols);
    if (indexCards.length === 0) return [];
    resolved = { mode: "external", cards: indexCards };
  }

  if (resolved.mode === "external") {
    if (resolved.cards.length === 0) return [];
    return [
      buildLoadPreviewEdge(edgeKey, resolved.cards, usageEl, symbolName, kind),
    ];
  }

  return [buildUsagePreviewEdge(edgeKey, resolved, usageEl, symbolName)];
}
