import { buildUsagePreviewEdge, buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { buildBindingPreviewEdges } from "@/lib/bindingPreviewEdges";
import { buildControlFlowPreviewEdges } from "@/lib/controlFlowPreviewEdges";
import { buildLocalPreviewEdges, canonicalLocalDefHost } from "@/lib/localDefLinks";
import { bindingDefForInit, type MemberSymbolIndex } from "@/lib/localSymbolLinks";
import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import { controlFlowAnchorFor } from "@/lib/controlFlowLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { SymbolEntry } from "@/types";
import type { GraphData } from "@/types";
import type { Node } from "@xyflow/react";

export type CodeLineTraceContext = {
  name: string;
  chipEl: HTMLElement;
  kind: SemanticTokenKind;
  tokenIndex: number;
  edgeKey: string;
  symbolIndex: MemberSymbolIndex;
  controlFlowIndex: ControlFlowIndex;
  sourceFlowId: string;
  memberId: string;
  lineNumber: number;
  symbols: Map<string, SymbolEntry[]>;
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  hasSymbol: (name: string) => boolean;
  lookup: (name: string) => SymbolEntry | undefined;
  cascadeEdges: PreviewEdgeSpec[];
};

/** Assembles preview edges for a CodeLine usage/definition token hover. */
export function assembleCodeLinePreviewEdges(ctx: CodeLineTraceContext): PreviewEdgeSpec[] {
  const {
    name,
    chipEl,
    kind,
    tokenIndex,
    edgeKey,
    symbolIndex,
    controlFlowIndex,
    sourceFlowId,
    memberId,
    lineNumber,
    symbols,
    graphData,
    getNode,
    hasSymbol,
    lookup,
    cascadeEdges,
  } = ctx;

  let bindingEdges = Number.isFinite(tokenIndex)
    ? buildBindingPreviewEdges(
        chipEl,
        symbolIndex,
        sourceFlowId,
        memberId,
        lineNumber,
        tokenIndex,
        edgeKey,
      )
    : [];

  const canonicalDef = canonicalLocalDefHost(chipEl);
  if (canonicalDef && canonicalDef !== chipEl) {
    const defBinding = buildBindingPreviewEdges(
      canonicalDef,
      symbolIndex,
      sourceFlowId,
      memberId,
      lineNumber,
      tokenIndex,
      edgeKey,
    );
    if (defBinding.length > 0 && bindingEdges.length === 0) {
      bindingEdges = defBinding;
    }
  }

  if (
    bindingEdges.length > 0 &&
    Number.isFinite(tokenIndex) &&
    bindingDefForInit(symbolIndex, lineNumber, tokenIndex)
  ) {
    return [...bindingEdges, ...cascadeEdges];
  }

  const localEdges = buildLocalPreviewEdges(chipEl, kind, edgeKey);

  const skipControlFlow =
    localEdges.length > 0 &&
    Number.isFinite(tokenIndex) &&
    (() => {
      const anchor = controlFlowAnchorFor(controlFlowIndex, lineNumber, tokenIndex);
      return anchor != null && anchor.role !== "head";
    })();

  const controlFlowEdges =
    Number.isFinite(tokenIndex) && !skipControlFlow
      ? buildControlFlowPreviewEdges(
          chipEl,
          controlFlowIndex,
          sourceFlowId,
          memberId,
          lineNumber,
          tokenIndex,
          edgeKey,
        )
      : [];

  if (
    localEdges.length > 0 ||
    bindingEdges.length > 0 ||
    controlFlowEdges.length > 0 ||
    cascadeEdges.length > 0
  ) {
    return [...localEdges, ...bindingEdges, ...controlFlowEdges, ...cascadeEdges];
  }

  const entry = lookup(name);
  if (!hasSymbol(name) && !entry) {
    const resolvedWithoutIndex = resolveVisibleTarget(
      name,
      symbols,
      graphData,
      getNode,
      sourceFlowId,
    );
    if (!resolvedWithoutIndex || resolvedWithoutIndex.mode === "external") {
      return cascadeEdges;
    }
    return [
      buildUsagePreviewEdge(edgeKey, resolvedWithoutIndex, chipEl, name),
      ...cascadeEdges,
    ];
  }

  if (!hasSymbol(name) || !entry) return cascadeEdges;

  const resolved = resolveVisibleTarget(name, symbols, graphData, getNode, sourceFlowId);
  if (!resolved) return cascadeEdges;

  if (resolved.mode === "external") {
    if (resolved.cards.length === 0) return cascadeEdges;
    return [
      buildLoadPreviewEdge(edgeKey, resolved.cards, chipEl, name, kind),
      ...cascadeEdges,
    ];
  }

  return [buildUsagePreviewEdge(edgeKey, resolved, chipEl, name), ...cascadeEdges];
}
