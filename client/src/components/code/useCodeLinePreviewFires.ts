import { useCallback, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphActions } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { assembleCodeLinePreviewEdges } from "@/lib/codeLineTraceEdges";
import { primaryHoverLoadEdge } from "@/lib/primaryHoverLoadEdge";
import { semanticFromChipElement } from "@/lib/tokenColors";
import { makeUsageTokenKey, tokenIndexFromChipKey } from "@/lib/traceKeys";
import { ctrlPreviewEdgeId } from "@/lib/ctrlPreviewHandles";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import type { CodeToken } from "@/lib/tokenizeLine";
import type { CodeLineProps } from "@/components/code/codeLineTypes";
import { useCodeLinePreviewMenus } from "@/components/code/useCodeLinePreviewMenus";
import { useCodeLineReceiverCascade } from "@/components/code/useCodeLineReceiverCascade";
import { useCodeLineSecondaryFires } from "@/components/code/useCodeLineSecondaryFires";

type PreviewFiresArgs = CodeLineProps & {
  tokens: CodeToken[];
  isLinkableIdentifier: (idx: number) => boolean;
};

export function useCodeLinePreviewFires(args: PreviewFiresArgs) {
  const {
    lineNumber,
    memberId,
    sourceFlowId,
    filePath,
    definedInLabel,
    sourceGraphNodeId,
    symbolIndex,
    lexicalGraph,
    controlFlowIndex,
    methodCode,
    methodStartLine,
    tokens,
    isLinkableIdentifier,
  } = args;

  const { symbols, lookup, hasSymbol } = useIndex();
  const { getNode } = useReactFlow();
  const {
    graphData,
    beginTrace,
    emitWireSignal,
    endHoverPreview,
    lookupIndexedUsageSites,
    lookupProjectReferences,
    lookupOffCanvasCallSiteFiles,
  } = useGraphActions();

  const { showUsageLoadMenu, clearConnectionMenu } = useCodeLinePreviewMenus(filePath);

  const edgeKeyRef = useRef<string | null>(null);
  const chipRefs = useRef<Map<string, TokenChipHandle>>(new Map());

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId,
      sourceMemberId: memberId,
      lookupIndexedUsageSites,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
    }),
    [getNode, graphData, lookupIndexedUsageSites, lookupOffCanvasCallSiteFiles, lookupProjectReferences, memberId, sourceFlowId],
  );

  const clearHover = useCallback(() => {
    edgeKeyRef.current = null;
    endHoverPreview();
  }, [endHoverPreview]);

  const buildReceiverCascadeEdges = useCodeLineReceiverCascade({
    tokens,
    lineNumber,
    chipRefs,
    isLinkableIdentifier,
    sourceFlowId,
  });

  const secondary = useCodeLineSecondaryFires({
    lineNumber,
    memberId,
    sourceFlowId,
    filePath,
    definedInLabel,
    sourceGraphNodeId,
    controlFlowIndex,
    chipRefs,
    defEdgeContext,
    lookup,
  });

  const buildUsagePreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      const tokenIndex = tokenIndexFromChipKey(chipKey);
      const tokenKey = makeUsageTokenKey(
        sourceFlowId,
        memberId,
        lineNumber,
        tokenIndex,
        name,
      );
      const edgeKey = ctrlPreviewEdgeId(sourceFlowId, `${memberId}::${lineNumber}::${name}`);
      const entry = lookup(name);
      const kind = semanticFromChipElement(chipEl, entry);
      const cascadeEdges = buildReceiverCascadeEdges(tokenIndex, edgeKey);
      const edges = assembleCodeLinePreviewEdges({
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
        lexicalGraph,
      });
      return { tokenKey, edgeKey, edges, kind, chipEl };
    },
    [
      buildReceiverCascadeEdges,
      getNode,
      graphData,
      hasSymbol,
      lookup,
      memberId,
      lineNumber,
      sourceFlowId,
      symbolIndex,
      lexicalGraph,
      controlFlowIndex,
      symbols,
      methodCode,
      methodStartLine,
    ],
  );

  const signalPreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      const built = buildUsagePreview(name, chipKey, chipEl);
      edgeKeyRef.current = built.edgeKey;
      emitWireSignal(built.tokenKey, built.edges);
    },
    [buildUsagePreview, emitWireSignal],
  );

  const firePreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      const built = buildUsagePreview(name, chipKey, chipEl);
      edgeKeyRef.current = built.edgeKey;

      const loadEdge = primaryHoverLoadEdge(built.edges, chipEl);
      if (loadEdge?.load) {
        showUsageLoadMenu(
          loadEdge.load.token,
          built.kind,
          chipEl,
          loadEdge.load.candidates,
        );
      } else {
        clearConnectionMenu();
      }

      beginTrace(built.tokenKey, built.edges);
    },
    [beginTrace, buildUsagePreview, clearConnectionMenu, showUsageLoadMenu],
  );

  return {
    chipRefs,
    clearHover,
    defEdgeContext,
    firePreview,
    signalPreview,
    hasSymbol,
    lookup,
    ...secondary,
  };
}
