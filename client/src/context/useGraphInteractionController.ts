import { useCallback, useLayoutEffect, useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { GraphInteractionContextValue } from "@/context/graphInteractionTypes";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useIndex } from "@/context/IndexContext";
import { useConnectionLookups } from "@/hooks/useConnectionLookups";
import { useConnectionEdgeState } from "@/hooks/useConnectionEdgeState";
import { useLoadTraceRebuild } from "@/hooks/useLoadTraceRebuild";
import { useRevealRevision } from "@/hooks/useRevealRevision";
import { useTokenTraceState } from "@/hooks/useTokenTraceState";
import { useTraceLitState } from "@/hooks/useTraceLitState";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import type { ReadingFocus } from "@/lib/graphReadingFocus";
import { useElementRegistryRevision } from "@/hooks/useElementRegistry";
import { isDefinitionSignatureLine } from "@/lib/resolveDefinitionUsageSites";
import { useIncrementalUsageSiteIndex } from "@/hooks/useIncrementalUsageSiteIndex";
import { rankAndCapUsageSites } from "@/lib/usageSiteRanking";
import { computeTraceLit } from "@/lib/computeTraceLit";
import { applyTraceLit } from "@/lib/traceLitController";
import { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";
import { refreshArrivalStrengthDom } from "@/lib/traceLitApplyDom";
import { clearPendingTraceHost } from "@/lib/pendingTraceChip";
import { subscribeTraceSignalPrime } from "@/lib/traceSignalPrime";
import type { GraphData } from "@/types";

type UseGraphInteractionControllerOptions = {
  graphData: GraphData | null;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onLoadFile: (filePath: string) => void | Promise<void>;
  onSelectReadingFocus?: (focus: ReadingFocus | null) => void;
  onFocusReadingMember?: (flowNodeId: string, memberId: string) => void;
};

export function useGraphInteractionController({
  graphData,
  nodes,
  setNodes,
  onLoadFile,
  onSelectReadingFocus,
  onFocusReadingMember,
}: UseGraphInteractionControllerOptions): GraphInteractionContextValue {
  const { isCtrlActive } = useCtrlKey();
  const { symbols, references } = useIndex();
  const { setCenter, getNode } = useReactFlow();
  const registryRevision = useElementRegistryRevision();
  const revealRevision = useRevealRevision(nodes);

  const trace = useTokenTraceState(isCtrlActive);
  const lookups = useConnectionLookups({ graphData, symbols, references });

  const indexedSymbolNames = useMemo(() => new Set(symbols.keys()), [symbols]);
  const usageSiteIndex = useIncrementalUsageSiteIndex(nodes, indexedSymbolNames);

  const lookupIndexedUsageSites = useCallback(
    (
      token: string,
      sourceFlowId: string,
      sourceMemberId?: string,
      anchorLineNumber?: number,
    ) => {
      const records = usageSiteIndex.get(token) ?? [];
      const filtered = records.filter(
        (rec) =>
          !isDefinitionSignatureLine(
            rec.line,
            token,
            rec.flowNodeId,
            rec.memberId,
            sourceFlowId,
            sourceMemberId,
          ),
      );
      return rankAndCapUsageSites(filtered, {
        flowNodeId: sourceFlowId,
        memberId: sourceMemberId,
        lineNumber: anchorLineNumber,
      });
    },
    [usageSiteIndex],
  );

  const edges = useConnectionEdgeState({
    graphData,
    nodes,
    getNode,
    symbols,
    usageSiteIndex,
    hoverPreviewEdges: trace.hoverPreviewEdges,
    anchorPreviewEdges: trace.anchorTrace?.edges ?? [],
    anchorTokenKey: trace.anchorTrace?.tokenKey ?? null,
    pinnedPreviewEdges: trace.pinnedPreviewEdges,
    pinnedTraces: trace.pinnedTraces,
    hoveredTokenKey: trace.hoveredTokenKey,
    traceTokenKey: trace.traceTokenKey,
  });

  const refreshLoadTraces = useLoadTraceRebuild({
    graphData,
    symbols,
    getNode,
    hoveredTokenKeyRef: trace.hoveredTokenKeyRef,
    hoverPreviewEdges: trace.hoverPreviewEdges,
    setHoverPreviewEdges: trace.setHoverPreviewEdges,
    pinnedTraces: trace.pinnedTraces,
    setPinnedTraces: trace.setPinnedTraces,
    pinnedTracesRef: trace.pinnedTracesRef,
    revealRevision,
  });

  const { isHandleActive, edgeKindAtHandle } = useTraceLitState({
    previewEdges: edges.previewEdges,
    hoverEmphasisEdges: edges.hoverEmphasisEdges,
    hoverPreviewEdges: trace.hoverPreviewEdges,
    pinnedTraces: trace.pinnedTraces,
    pinnedTokenKeySet: trace.pinnedTokenKeySet,
    hoveredTokenKey: trace.hoveredTokenKey,
    emphasisTokenKey: trace.emphasisTokenKey,
    traceTokenKey: trace.traceTokenKey,
    visibleEdgeKinds: edges.visibleEdgeKinds,
    getNode,
    revealRevision,
    registryRevision,
    onFadeComplete: trace.completeFade,
  });

  useLayoutEffect(() => {
    const cache = createRefinePreviewEdgeCache();
    return subscribeTraceSignalPrime(({ tokenKey, edges }) => {
      clearPendingTraceHost();
      cache.clear();
      const lit = computeTraceLit(tokenKey, edges, getNode, cache);
      applyTraceLit(lit, {
        pinnedTokenKeys: trace.pinnedTokenKeySet,
        hoveredTokenKey: tokenKey,
        emphasisTokenKey: tokenKey,
        previewEdges: edges,
        getNode,
      });
      refreshArrivalStrengthDom();
    });
  }, [getNode, trace.pinnedTokenKeySet]);

  const focusFlowNode = useCallback(
    (flowNodeId: string) => {
      const node = getNode(flowNodeId) ?? nodes.find((n) => n.id === flowNodeId);
      if (!node) return;

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === flowNodeId,
          data: {
            ...n.data,
            selected: n.id === flowNodeId,
            pathHighlighted: n.id === flowNodeId,
          },
        })),
      );

      const w =
        typeof node.width === "number" ? node.width : CLASS_NODE_DEFAULT_WIDTH;
      const h = typeof node.height === "number" ? node.height : 120;
      void setCenter(node.position.x + w / 2, node.position.y + h / 2, {
        zoom: 1.15,
        duration: 350,
      });
    },
    [getNode, nodes, setCenter, setNodes],
  );

  return useMemo(
    () => ({
      previewEdges: edges.previewEdges,
      structuralEdges: edges.structuralEdges,
      pulseEdges: edges.pulseEdges,
      visibleEdgeKinds: edges.visibleEdgeKinds,
      isEdgeKindVisible: edges.isEdgeKindVisible,
      toggleEdgeKind: edges.toggleEdgeKind,
      transitiveHopDepth: edges.transitiveHopDepth,
      setPulseEdges: edges.setPulseEdges,
      isHandleActive,
      edgeKindAtHandle,
      beginTrace: trace.beginTrace,
      emitWireSignal: trace.emitWireSignal,
      endTrace: trace.endTrace,
      endHoverPreview: trace.endHoverPreview,
      isWarm: trace.isWarm,
      scheduleHoverFire: trace.scheduleHoverFire,
      scheduleHoverClear: trace.scheduleHoverClear,
      scheduleHoverLeaveGrace: trace.scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace: trace.cancelHoverLeaveGrace,
      tokenInfo: trace.tokenInfo,
      showTokenInfo: trace.showTokenInfo,
      clearTokenInfo: trace.clearTokenInfo,
      isTraceActive: trace.isTraceActive,
      findReferences: lookups.findReferences,
      findCallSites: lookups.findCallSites,
      lookupProjectReferences: lookups.lookupProjectReferences,
      lookupOffCanvasCallSiteFiles: lookups.lookupOffCanvasCallSiteFiles,
      focusFlowNode,
      selectReadingFocus: onSelectReadingFocus ?? (() => {}),
      focusReadingMember: onFocusReadingMember ?? (() => {}),
      onLoadFile,
      refreshLoadTraces,
      graphData,
      pinTrace: trace.pinTrace,
      pinnedTokenKey: trace.activePinKey,
      pinnedTraces: trace.pinnedTraces,
      activePinKey: trace.activePinKey,
      setActivePinKey: trace.setActivePinKey,
      isPinnedTokenKey: trace.isPinnedTokenKey,
      hoveredTokenKey: trace.hoveredTokenKey,
      emphasisTokenKey: trace.emphasisTokenKey,
      traceTokenKey: trace.traceTokenKey,
      sessionMood: trace.sessionMood,
      debugEvents: trace.debugEvents,
      lookupIndexedUsageSites,
      goBackPin: trace.goBackPin,
      canGoBackPin: trace.canGoBackPin,
      connectionMenu: trace.connectionMenu,
      showConnectionMenu: trace.showConnectionMenu,
      clearConnectionMenu: trace.clearConnectionMenu,
    }),
    [
      edges,
      isHandleActive,
      edgeKindAtHandle,
      trace,
      lookups,
      focusFlowNode,
      onFocusReadingMember,
      onSelectReadingFocus,
      onLoadFile,
      refreshLoadTraces,
      graphData,
      lookupIndexedUsageSites,
    ],
  );
}
