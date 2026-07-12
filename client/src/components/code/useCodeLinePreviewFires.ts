import { useCallback, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
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
    endHoverPreview,
    lookupIndexedUsageSites,
    lookupProjectReferences,
    lookupOffCanvasCallSiteFiles,
  } = useGraphInteraction();

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

  const firePreview = useCallback(
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
      edgeKeyRef.current = edgeKey;

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

      const loadEdge = primaryHoverLoadEdge(edges, chipEl);
      if (loadEdge?.load) {
        showUsageLoadMenu(
          loadEdge.load.token,
          kind,
          chipEl,
          loadEdge.load.candidates,
        );
      } else {
        clearConnectionMenu();
      }

      beginTrace(tokenKey, edges);
    },
    [
      beginTrace,
      buildReceiverCascadeEdges,
      clearConnectionMenu,
      getNode,
      graphData,
      hasSymbol,
      lookup,
      memberId,
      lineNumber,
      showUsageLoadMenu,
      sourceFlowId,
      symbolIndex,
      lexicalGraph,
      controlFlowIndex,
      symbols,
      methodCode,
      methodStartLine,
    ],
  );

  return {
    chipRefs,
    clearHover,
    defEdgeContext,
    firePreview,
    hasSymbol,
    lookup,
    ...secondary,
  };
}
