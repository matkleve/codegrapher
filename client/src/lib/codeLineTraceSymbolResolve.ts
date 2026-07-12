import { buildUsagePreviewEdge, buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { signatureTypeRelativeEdges } from "@/lib/codeLineTraceSignatureType";
import type { CodeLineTraceContext } from "@/lib/codeLineTraceContext";

export function symbolIndexedTraceEdges(
  ctx: CodeLineTraceContext,
  backwardEdges: PreviewEdgeSpec[],
  cascadeEdges: PreviewEdgeSpec[],
): PreviewEdgeSpec[] {
  const { name, chipEl, kind, symbols, graphData, getNode, sourceFlowId, hasSymbol, lookup } =
    ctx;

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
      return [...cascadeEdges, ...backwardEdges, ...signatureTypeRelativeEdges(ctx)];
    }
    return [
      buildUsagePreviewEdge(ctx.edgeKey, resolvedWithoutIndex, chipEl, name),
      ...cascadeEdges,
      ...backwardEdges,
      ...signatureTypeRelativeEdges(ctx),
    ];
  }

  if (!hasSymbol(name) || !entry) {
    return [...cascadeEdges, ...backwardEdges, ...signatureTypeRelativeEdges(ctx)];
  }

  const resolved = resolveVisibleTarget(name, symbols, graphData, getNode, sourceFlowId);
  if (!resolved) return [...cascadeEdges, ...backwardEdges, ...signatureTypeRelativeEdges(ctx)];

  if (resolved.mode === "external") {
    if (resolved.cards.length === 0) {
      return [...cascadeEdges, ...backwardEdges, ...signatureTypeRelativeEdges(ctx)];
    }
    return [
      buildLoadPreviewEdge(ctx.edgeKey, resolved.cards, chipEl, name, kind as SemanticTokenKind),
      ...cascadeEdges,
      ...backwardEdges,
      ...signatureTypeRelativeEdges(ctx),
    ];
  }

  return [
    buildUsagePreviewEdge(ctx.edgeKey, resolved, chipEl, name),
    ...cascadeEdges,
    ...backwardEdges,
    ...signatureTypeRelativeEdges(ctx),
  ];
}
