import { useCallback, useLayoutEffect, useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type {
  GraphActionsValue,
  GraphTraceStateValue,
} from "@/context/graphInteractionTypes";
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
import { refreshArrivalStrengthDom } from "@/lib/traceLitApplyDom";
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
}: UseGraphInteractionControllerOptions): {
  actions: GraphActionsValue;
  traceState: GraphTraceStateValue;
} {
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
    return subscribeTraceSignalPrime(() => {
      refreshArrivalStrengthDom();
    });
  }, []);

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

  // Identity-stable slice. Every field here has a stable identity across a
  // hover/trace gesture, so this object keeps the same identity too — consumers
  // that read only actions never re-render while tracing.
  const actions = useMemo<GraphActionsValue>(
    () => ({
      toggleEdgeKind: edges.toggleEdgeKind,
      transitiveHopDepth: edges.transitiveHopDepth,
      setPulseEdges: edges.setPulseEdges,
      beginTrace: trace.beginTrace,
      emitWireSignal: trace.emitWireSignal,
      endTrace: trace.endTrace,
      endHoverPreview: trace.endHoverPreview,
      scheduleHoverFire: trace.scheduleHoverFire,
      scheduleHoverClear: trace.scheduleHoverClear,
      scheduleHoverLeaveGrace: trace.scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace: trace.cancelHoverLeaveGrace,
      showTokenInfo: trace.showTokenInfo,
      clearTokenInfo: trace.clearTokenInfo,
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
      setActivePinKey: trace.setActivePinKey,
      isPinnedTokenKey: trace.isPinnedTokenKey,
      goBackPin: trace.goBackPin,
      lookupIndexedUsageSites,
      showConnectionMenu: trace.showConnectionMenu,
      clearConnectionMenu: trace.clearConnectionMenu,
    }),
    [
      edges.toggleEdgeKind,
      edges.transitiveHopDepth,
      edges.setPulseEdges,
      trace.beginTrace,
      trace.emitWireSignal,
      trace.endTrace,
      trace.endHoverPreview,
      trace.scheduleHoverFire,
      trace.scheduleHoverClear,
      trace.scheduleHoverLeaveGrace,
      trace.cancelHoverLeaveGrace,
      trace.showTokenInfo,
      trace.clearTokenInfo,
      trace.pinTrace,
      trace.setActivePinKey,
      trace.isPinnedTokenKey,
      trace.goBackPin,
      trace.showConnectionMenu,
      trace.clearConnectionMenu,
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

  // Volatile slice. Changes as the pointer moves / a trace commits.
  const traceState = useMemo<GraphTraceStateValue>(
    () => ({
      previewEdges: edges.previewEdges,
      structuralEdges: edges.structuralEdges,
      pulseEdges: edges.pulseEdges,
      visibleEdgeKinds: edges.visibleEdgeKinds,
      isEdgeKindVisible: edges.isEdgeKindVisible,
      isHandleActive,
      edgeKindAtHandle,
      isWarm: trace.isWarm,
      tokenInfo: trace.tokenInfo,
      isTraceActive: trace.isTraceActive,
      pinnedTokenKey: trace.activePinKey,
      pinnedTraces: trace.pinnedTraces,
      activePinKey: trace.activePinKey,
      hoveredTokenKey: trace.hoveredTokenKey,
      emphasisTokenKey: trace.emphasisTokenKey,
      traceTokenKey: trace.traceTokenKey,
      sessionMood: trace.sessionMood,
      debugEvents: trace.debugEvents,
      canGoBackPin: trace.canGoBackPin,
      connectionMenu: trace.connectionMenu,
    }),
    [
      edges.previewEdges,
      edges.structuralEdges,
      edges.pulseEdges,
      edges.visibleEdgeKinds,
      edges.isEdgeKindVisible,
      isHandleActive,
      edgeKindAtHandle,
      trace.isWarm,
      trace.tokenInfo,
      trace.isTraceActive,
      trace.pinnedTraces,
      trace.activePinKey,
      trace.hoveredTokenKey,
      trace.emphasisTokenKey,
      trace.traceTokenKey,
      trace.sessionMood,
      trace.debugEvents,
      trace.canGoBackPin,
      trace.connectionMenu,
    ],
  );

  return useMemo(() => ({ actions, traceState }), [actions, traceState]);
}
