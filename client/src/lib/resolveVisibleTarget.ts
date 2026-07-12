import { graphNodeForEntry } from "@/lib/semanticLookup";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import type { GraphData, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";
import {
  buildExternalReferenceCards,
  externalCardsNotYetInGraph,
  findDefinitionInLoadedGraph,
  targetFromGraphNode,
} from "@/lib/resolveVisibleTargetLookup";
import type { VisibleTargetResult } from "@/lib/resolveVisibleTargetTypes";

export type {
  ExternalReferenceCard,
  GraphTargetLevel,
  GraphVisibleTarget,
  VisibleTargetResult,
} from "@/lib/resolveVisibleTargetTypes";

export {
  buildExternalReferenceCards,
  externalCardsNotYetInGraph,
  findDefinitionInLoadedGraph,
  isEntryInGraph,
  targetFromGraphNode,
} from "@/lib/resolveVisibleTargetLookup";

export function resolveVisibleTarget(
  token: string,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
): VisibleTargetResult {
  const entries = symbols.get(token) ?? [];
  if (entries.length === 0) return null;

  const defaultKind = symbolKindToSemantic(entries[0]!.kind);

  if (graphData) {
    for (const entry of entries) {
      const graphNode = graphNodeForEntry(entry, token, graphData);
      if (!graphNode) continue;

      const target = targetFromGraphNode(
        token,
        entry,
        graphNode,
        graphData,
        getNode,
        sourceFlowId,
      );
      if (target) return target;
    }

    const onCanvas = findDefinitionInLoadedGraph(
      token,
      graphData,
      getNode,
      sourceFlowId,
      defaultKind,
    );
    if (onCanvas) return onCanvas;
  }

  const cards = externalCardsNotYetInGraph(token, symbols, graphData);
  if (cards.length > 0) {
    return { mode: "external", cards };
  }

  const moduleLevel = entries.filter(
    (e) =>
      !e.enclosingSymbol &&
      (e.kind === "type" || e.kind === "interface"),
  );
  if (moduleLevel.length > 0) {
    const onCanvas = graphData
      ? findDefinitionInLoadedGraph(
          token,
          graphData,
          getNode,
          sourceFlowId,
          defaultKind,
        )
      : null;
    if (!onCanvas) {
      const indexCards = buildExternalReferenceCards(token, symbols);
      if (indexCards.length > 0) {
        return { mode: "external", cards: indexCards };
      }
    }
  }

  return null;
}
