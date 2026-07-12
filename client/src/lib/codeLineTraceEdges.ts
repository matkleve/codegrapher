import { buildUsagePreviewEdge, buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { buildBindingPreviewEdges } from "@/lib/bindingPreviewEdges";
import { buildBindingInitializerCascadeEdges } from "@/lib/bindingInitializerCascade";
import { buildControlFlowPreviewEdges } from "@/lib/controlFlowPreviewEdges";
import { buildLocalPreviewEdges, canonicalLocalDefHost } from "@/lib/localDefLinks";
import {
  buildParamTypeCascadeEdges,
  paramNameFromDefId,
} from "@/lib/paramTypeCascadeEdges";
import { findLocalDefElement } from "@/lib/localDefElements";
import { graphPane } from "@/lib/graphPaneDom";
import { bindingDefForInit, type MemberSymbolIndex } from "@/lib/localSymbolLinks";
import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import { controlFlowAnchorFor } from "@/lib/controlFlowLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { SymbolEntry, GraphData } from "@/types";
import type { Node } from "@xyflow/react";
import { buildBackwardLexicalRelatives } from "@/lib/defRelativePreviewEdges";
import { buildSignatureTypeParamCascade } from "@/lib/signatureTypeParamCascade";
import { paramNameForSignatureType } from "@/lib/paramTypeAnchors";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { tokenizeLine } from "@/lib/tokenizeLine";

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

function backwardLexicalEdges(ctx: CodeLineTraceContext): PreviewEdgeSpec[] {
  const {
    chipEl,
    kind,
    tokenIndex,
    symbolIndex,
    sourceFlowId,
    memberId,
    lineNumber,
    methodCode,
    methodStartLine,
    getNode,
    edgeKey,
  } = ctx;
  if (!methodCode || methodStartLine == null || !Number.isFinite(tokenIndex)) return [];
  const classData = getClassNodeData(sourceFlowId, getNode);
  if (!classData) return [];

  const lineText = methodCode.split("\n")[lineNumber - methodStartLine] ?? "";
  const tokens = tokenizeLine(lineText).tokens;
  let dotIdx = tokenIndex - 1;
  while (dotIdx >= 0 && tokens[dotIdx]?.kind === "whitespace") dotIdx--;
  const isMemberProp = dotIdx >= 0 && tokens[dotIdx]?.text === ".";

  if (!isMemberProp && !chipEl.dataset.localTargetId) return [];

  return buildBackwardLexicalRelatives({
    originEl: chipEl,
    symbolIndex,
    methodCode,
    methodStartLine,
    flowNodeId: sourceFlowId,
    memberId,
    classData,
    kind,
    edgeIdPrefix: edgeKey,
    startLine: lineNumber,
    startTokenIndex: tokenIndex,
  });
}

function signatureTypeRelativeEdges(ctx: CodeLineTraceContext): PreviewEdgeSpec[] {
  const {
    name,
    chipEl,
    kind,
    lineNumber,
    methodCode,
    methodStartLine,
    memberId,
    sourceFlowId,
    symbolIndex,
    symbols,
    graphData,
    getNode,
  } = ctx;
  if (!methodCode || methodStartLine == null) return [];
  if (kind !== "type" && kind !== "class") return [];
  const lineIdx = lineNumber - methodStartLine;
  if (lineIdx < 0) return [];
  const lineText = methodCode.split("\n")[lineIdx] ?? "";
  const paramName = paramNameForSignatureType(lineText, name);
  if (!paramName) return [];
  return buildSignatureTypeParamCascade({
    symbolName: name,
    typeKind: kind,
    sigTypeEl: chipEl,
    paramName,
    symbolIndex,
    flowNodeId: sourceFlowId,
    memberId,
    symbols,
    graphData,
    getNode,
    edgeIdPrefix: `sig-inline-${paramName}-${name}`,
  });
}

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
  methodCode?: string;
  methodStartLine?: number;
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
    methodCode,
    methodStartLine,
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

  const localEdges = buildLocalPreviewEdges(chipEl, kind, edgeKey);

  if (bindingEdges.length > 0 && localEdges.length > 0) {
    bindingEdges = bindingEdges.map((edge) => ({ ...edge, hop: 2 }));
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
      : canonicalDef?.dataset.localDefId?.includes("::local::")
        ? canonicalDef
        : null;

  if (
    bindingEdges.length > 0 &&
    bindingDefElForCascade &&
    methodCode &&
    methodStartLine != null
  ) {
    bindingCascade = buildBindingInitializerCascadeEdges({
      bindingDefEl: bindingDefElForCascade,
      symbolIndex,
      flowNodeId: sourceFlowId,
      memberId,
      methodCode,
      methodStartLine,
      edgeIdPrefix: edgeKey,
      symbols,
      graphData,
      getNode,
      hasSymbol,
    });
  }

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

  if (
    localEdges.length > 0 ||
    bindingEdges.length > 0 ||
    controlFlowEdges.length > 0 ||
    cascadeEdges.length > 0 ||
    backwardEdges.length > 0
  ) {
    return [
      ...localEdges,
      ...bindingEdges,
      ...bindingCascade,
      ...controlFlowEdges,
      ...cascadeEdges,
      ...backwardEdges,
      ...typeCascade,
    ];
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
      return [...cascadeEdges, ...backwardEdges, ...signatureTypeRelativeEdges(ctx)];
    }
    return [
      buildUsagePreviewEdge(edgeKey, resolvedWithoutIndex, chipEl, name),
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
      buildLoadPreviewEdge(edgeKey, resolved.cards, chipEl, name, kind),
      ...cascadeEdges,
      ...backwardEdges,
      ...signatureTypeRelativeEdges(ctx),
    ];
  }

  return [
    buildUsagePreviewEdge(edgeKey, resolved, chipEl, name),
    ...cascadeEdges,
    ...backwardEdges,
    ...signatureTypeRelativeEdges(ctx),
  ];
}
