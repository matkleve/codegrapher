import { buildUsagePreviewEdge, buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { buildBindingPreviewEdges } from "@/lib/bindingPreviewEdges";
import { buildLexicalGraph } from "@/lib/lexicalGraph";
import { buildControlFlowPreviewEdges } from "@/lib/controlFlowPreviewEdges";
import { buildLocalPreviewEdges, canonicalLocalDefHost } from "@/lib/localDefLinks";
import {
  buildParamTypeCascadeEdges,
  paramNameFromDefId,
} from "@/lib/paramTypeCascadeEdges";
import { findLocalDefElement } from "@/lib/localDefElements";
import { graphPane } from "@/lib/graphPaneDom";
import { bindingDefForInit } from "@/lib/localSymbolLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { previewHopFromDepth } from "@/lib/traceDepth";
import { backwardLexicalEdges } from "@/lib/codeLineTraceBackward";
import { buildUpstreamParamTypeCascade } from "@/lib/codeLineTraceTypeProvenance";
import {
  forwardLexicalRelativesForBindingDef,
  forwardLexicalRelativesForParamDef,
} from "@/lib/codeLineTraceForward";
import { symbolIndexedTraceEdges } from "@/lib/codeLineTraceSymbolResolve";
import { traceBindingInitCascadeEdges } from "@/lib/traceEdgesForOrigin";
import type { CodeLineTraceContext } from "@/lib/codeLineTraceContext";

export type { CodeLineTraceContext } from "@/lib/codeLineTraceContext";

/** Assembles preview edges for a CodeLine usage/definition token hover. */
export function assembleCodeLinePreviewEdges(ctx: CodeLineTraceContext): PreviewEdgeSpec[] {
  const {
    chipEl,
    kind,
    tokenIndex,
    edgeKey,
    symbolIndex,
    controlFlowIndex,
    sourceFlowId,
    memberId,
    lineNumber,
    methodCode,
    methodStartLine,
    symbols,
    graphData,
    getNode,
    hasSymbol,
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

  const localEdges = buildLocalPreviewEdges(chipEl, kind, edgeKey);

  if (bindingEdges.length > 0 && localEdges.length > 0) {
    const compoundHop = previewHopFromDepth(2);
    bindingEdges = bindingEdges.map((edge) =>
      compoundHop != null ? { ...edge, hop: compoundHop } : edge,
    );
  }

  let bindingCascade: PreviewEdgeSpec[] = [];
  const initBindingDefId =
    Number.isFinite(tokenIndex) && bindingEdges.length > 0
      ? bindingDefForInit(symbolIndex, lineNumber, tokenIndex)
      : undefined;
  const pane = graphPane();
  const bindingDefElForCascade =
    initBindingDefId && pane
      ? findLocalDefElement(pane, initBindingDefId)
      : chipEl.dataset.localDefId?.includes("::local::")
        ? chipEl
        : null;

  if (
    bindingEdges.length > 0 &&
    bindingDefElForCascade &&
    methodCode &&
    methodStartLine != null
  ) {
    const graph =
      ctx.lexicalGraph ??
      buildLexicalGraph(symbolIndex, methodCode, methodStartLine);
    bindingCascade = traceBindingInitCascadeEdges({
      bindingDefEl: bindingDefElForCascade,
      symbolIndex,
      lexicalGraph: graph,
      methodCode,
      methodStartLine,
      flowNodeId: sourceFlowId,
      memberId,
      edgeIdPrefix: edgeKey,
      symbols,
      graphData,
      getNode,
      hasSymbol,
    });
  }

  const controlFlowEdges =
    Number.isFinite(tokenIndex)
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

  const localTargetId = chipEl.dataset.localTargetId;
  const localDefId = chipEl.dataset.localDefId;
  const paramDefEl =
    canonicalLocalDefHost(chipEl) ??
    (localDefId?.includes("::param::") ? chipEl : null);
  const paramName =
    (localTargetId != null ? paramNameFromDefId(localTargetId) : null) ??
    (localDefId != null ? paramNameFromDefId(localDefId) : null);
  const isParamToken =
    localTargetId?.includes("::param::") === true ||
    localDefId?.includes("::param::") === true;
  const isParamDefHost = localDefId?.includes("::param::") === true;
  const typeCascade =
    paramName != null &&
    paramDefEl != null &&
    isParamToken &&
    (localEdges.length > 0 || isParamDefHost)
      ? buildParamTypeCascadeEdges({
          paramName,
          paramDefEl,
          flowNodeId: sourceFlowId,
          memberId,
          symbols,
          graphData,
          getNode,
          hasSymbol,
          edgeIdPrefix: edgeKey,
        })
      : [];

  const backwardEdges = backwardLexicalEdges(ctx);
  const skipUpstreamType =
    paramName != null && isParamToken ? new Set([paramName]) : new Set<string>();
  const upstreamTypeCascade = buildUpstreamParamTypeCascade(ctx, skipUpstreamType);
  const bindingForwardDefId =
    initBindingDefId ??
    (localDefId?.includes("::local::") ? localDefId : undefined);
  const bindingForwardEl =
    bindingDefElForCascade ??
    (bindingForwardDefId && localDefId === bindingForwardDefId ? chipEl : null);
  const forwardRelatives = isParamDefHost
    ? forwardLexicalRelativesForParamDef(ctx)
    : bindingForwardDefId &&
        bindingForwardEl &&
        bindingEdges.length > 0 &&
        methodCode &&
        methodStartLine != null
      ? forwardLexicalRelativesForBindingDef(ctx, bindingForwardDefId, bindingForwardEl)
      : [];

  if (
    localEdges.length > 0 ||
    bindingEdges.length > 0 ||
    controlFlowEdges.length > 0 ||
    cascadeEdges.length > 0 ||
    backwardEdges.length > 0 ||
    upstreamTypeCascade.length > 0 ||
    forwardRelatives.length > 0
  ) {
    return [
      ...localEdges,
      ...forwardRelatives,
      ...bindingEdges,
      ...bindingCascade,
      ...controlFlowEdges,
      ...cascadeEdges,
      ...backwardEdges,
      ...upstreamTypeCascade,
      ...typeCascade,
    ];
  }

  return symbolIndexedTraceEdges(ctx, backwardEdges, cascadeEdges);
}
