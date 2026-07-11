import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useIndex } from "@/context/IndexContext";
import { useConnectionLookups } from "@/hooks/useConnectionLookups";
import { useConnectionEdgeState } from "@/hooks/useConnectionEdgeState";
import { useLoadTraceRebuild } from "@/hooks/useLoadTraceRebuild";
import { useRevealRevision } from "@/hooks/useRevealRevision";
import { useTokenTraceState } from "@/hooks/useTokenTraceState";
import { useTraceLitState } from "@/hooks/useTraceLitState";
import {
  type PreviewEdgeSpec,
} from "@/lib/previewEdgeTypes";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import { useElementRegistryRevision } from "@/hooks/useElementRegistry";
import { isDefinitionSignatureLine } from "@/lib/resolveDefinitionUsageSites";
import { buildUsageSiteIndex, type UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import type { CallSiteReference } from "@/lib/projectReferences";
import type { PinnedTrace } from "@/lib/pinnedTraces";
import type { TokenReference } from "@/lib/semanticLookup";
import type { GraphData, ReferenceEntry } from "@/types";

export type { PreviewEdgeSpec, AnchorRef } from "@/lib/previewEdgeTypes";
export { edgeTouchesHandle, refinePreviewEdge } from "@/lib/resolveLiveAnchor";

export type AnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function toAnchorRect(rect: DOMRect): AnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export type { TokenInfoState };

type GraphInteractionContextValue = {
  previewEdges: PreviewEdgeSpec[];
  structuralEdges: StructuralEdgeSpec[];
  pulseEdges: StructuralEdgeSpec[];
  visibleEdgeKinds: ReadonlySet<ConnectionKind>;
  isEdgeKindVisible: (kind: ConnectionKind) => boolean;
  toggleEdgeKind: (kind: ConnectionKind) => void;
  setPulseEdges: React.Dispatch<React.SetStateAction<StructuralEdgeSpec[]>>;
  transitiveHopDepth: number;
  isHandleActive: (handle: string) => boolean;
  edgeKindAtHandle: (handle: string) => SemanticTokenKind | null;
  /** Set trace key + wires in one commit (avoids staggered lit paint). */
  beginTrace: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  endTrace: () => void;
  /** End ephemeral hover preview; restores pinned edges when a pin is active. */
  endHoverPreview: () => void;
  isWarm: boolean;
  scheduleHoverFire: (
    tokenKey: string,
    onFire: () => void,
    onClear: () => void,
    onInfo?: () => void,
  ) => void;
  scheduleHoverClear: (tokenKey: string, onClear: () => void) => void;
  scheduleHoverLeaveGrace: () => void;
  cancelHoverLeaveGrace: () => void;
  tokenInfo: TokenInfoState;
  showTokenInfo: (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => void;
  clearTokenInfo: () => void;
  isTraceActive: boolean;
  findReferences: (token: string) => TokenReference[];
  findCallSites: (token: string) => CallSiteReference[];
  lookupProjectReferences: (token: string) => ReferenceEntry[];
  lookupOffCanvasCallSiteFiles: (token: string) => ReferenceEntry[];
  focusFlowNode: (flowNodeId: string) => void;
  /** Expand member, widen node, scroll into reading position; persists `?focus=` URL. */
  focusReadingMember: (flowNodeId: string, memberId: string) => void;
  onLoadFile: (filePath: string) => void | Promise<void>;
  /** Swap load stubs for in-graph wires (e.g. target file already on canvas). */
  refreshLoadTraces: () => void;
  graphData: GraphData | null;
  pinTrace: (tokenKey: string, shiftKey?: boolean) => void;
  pinnedTokenKey: string | null;
  pinnedTraces: PinnedTrace[];
  activePinKey: string | null;
  setActivePinKey: (tokenKey: string) => void;
  isPinnedTokenKey: (tokenKey: string) => boolean;
  hoveredTokenKey: string | null;
  lookupIndexedUsageSites: (
    token: string,
    sourceFlowId: string,
    sourceMemberId?: string,
  ) => UsageSiteRecord[];
  /** Undo one pin/clear action, restoring the selection it replaced. */
  goBackPin: () => void;
  canGoBackPin: boolean;
  connectionMenu: TokenConnectionMenuState | null;
  showConnectionMenu: (state: TokenConnectionMenuState) => void;
  clearConnectionMenu: () => void;
};

const GraphInteractionContext = createContext<GraphInteractionContextValue | null>(
  null,
);

type GraphInteractionProviderProps = {
  children: ReactNode;
  graphData: GraphData | null;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onLoadFile: (filePath: string) => void | Promise<void>;
  onFocusReadingMember?: (flowNodeId: string, memberId: string) => void;
};

export function GraphInteractionProvider({
  children,
  graphData,
  nodes,
  setNodes,
  onLoadFile,
  onFocusReadingMember,
}: GraphInteractionProviderProps) {
  const { isCtrlActive } = useCtrlKey();
  const { symbols, references } = useIndex();
  const { setCenter, getNode } = useReactFlow();
  // Recompute trace-lit when the mounted-trace-host set changes (a member or
  // class expanding/collapsing), so newly revealed tokens light up.
  const registryRevision = useElementRegistryRevision();
  const revealRevision = useRevealRevision(nodes);

  const trace = useTokenTraceState(isCtrlActive);
  const lookups = useConnectionLookups({ graphData, symbols, references });

  const indexedSymbolNames = useMemo(() => new Set(symbols.keys()), [symbols]);
  const usageSiteIndex = useMemo(
    () => buildUsageSiteIndex(nodes, indexedSymbolNames),
    [indexedSymbolNames, nodes],
  );

  const lookupIndexedUsageSites = useCallback(
    (token: string, sourceFlowId: string, sourceMemberId?: string) => {
      const records = usageSiteIndex.get(token) ?? [];
      return records.filter(
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
    hoverPreviewEdges: trace.hoverPreviewEdges,
    pinnedTraces: trace.pinnedTraces,
    pinnedTokenKeySet: trace.pinnedTokenKeySet,
    hoveredTokenKey: trace.hoveredTokenKey,
    traceTokenKey: trace.traceTokenKey,
    visibleEdgeKinds: edges.visibleEdgeKinds,
    getNode,
    revealRevision,
    registryRevision,
  });

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

  const value = useMemo(
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
      onLoadFile,
      refreshLoadTraces,
      graphData,
      lookupIndexedUsageSites,
    ],
  );

  return (
    <GraphInteractionContext.Provider value={value}>
      {children}
    </GraphInteractionContext.Provider>
  );
}

export function useGraphInteraction(): GraphInteractionContextValue {
  const ctx = useContext(GraphInteractionContext);
  if (!ctx) {
    throw new Error("useGraphInteraction must be used within GraphInteractionProvider");
  }
  return ctx;
}
