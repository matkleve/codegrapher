import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useIndex } from "@/context/IndexContext";
import {
  findSemanticReferences,
  type TokenReference,
} from "@/lib/semanticLookup";
import {
  clearHoverTimers,
  emptyHoverTimers,
  fireDelayMs,
  LEAVE_GRACE_MS,
  type HoverIntentTimers,
} from "@/lib/hoverIntent";
import {
  type PreviewEdgeSpec,
} from "@/lib/previewEdgeTypes";
import { computeTraceLit, EMPTY_TRACE_LIT, mergeTraceLit } from "@/lib/computeTraceLit";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { useClearPinnedOnClickAway } from "@/hooks/useClearPinnedOnClickAway";
import { clearJumpTooltip } from "@/context/JumpTooltipContext";
import {
  isDefinitionSignatureLine,
} from "@/lib/linksForElement";
import { buildUsageSiteIndex, type UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { GraphData } from "@/types";

export type { PreviewEdgeSpec, AnchorRef } from "@/lib/previewEdgeTypes";
export { edgeTouchesHandle } from "@/lib/resolveLiveAnchor";

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
  isHandleActive: (handle: string) => boolean;
  edgeKindAtHandle: (handle: string) => SemanticTokenKind | null;
  /** Set trace key + wires in one commit (avoids staggered lit paint). */
  beginTrace: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  endTrace: () => void;
  /** End ephemeral hover preview; restores pinned edges when a pin is active. */
  endHoverPreview: () => void;
  isWarm: boolean;
  scheduleHoverFire: (tokenKey: string, onFire: () => void, onClear: () => void) => void;
  scheduleHoverClear: (tokenKey: string, onClear: () => void) => void;
  scheduleHoverLeaveGrace: () => void;
  cancelHoverLeaveGrace: () => void;
  tokenInfo: TokenInfoState;
  showTokenInfo: (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => void;
  clearTokenInfo: () => void;
  isCtrlPreviewMode: boolean;
  isTraceActive: boolean;
  isTraceLit: (traceKey: string) => boolean;
  isTraceEndpoint: (traceKey: string) => boolean;
  isTraceMemberLit: (memberId: string) => boolean;
  isTraceOwnerLit: (memberId: string) => boolean;
  isTraceLineLit: (memberId: string) => boolean;
  isTraceNodeLit: (flowNodeId: string) => boolean;
  findReferences: (token: string) => TokenReference[];
  focusFlowNode: (flowNodeId: string) => void;
  onLoadFile: (filePath: string) => void | Promise<void>;
  graphData: GraphData | null;
  pinTrace: (tokenKey: string) => void;
  pinnedTokenKey: string | null;
  hoveredTokenKey: string | null;
  lookupIndexedUsageSites: (
    token: string,
    sourceFlowId: string,
    sourceMemberId?: string,
  ) => UsageSiteRecord[];
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
};

export function GraphInteractionProvider({
  children,
  graphData,
  nodes,
  setNodes,
  onLoadFile,
}: GraphInteractionProviderProps) {
  const { isCtrlActive } = useCtrlKey();
  const { symbols } = useIndex();
  const { setCenter, getNode } = useReactFlow();

  const [hoverPreviewEdges, setHoverPreviewEdges] = useState<PreviewEdgeSpec[]>([]);
  const [pinnedPreviewEdges, setPinnedPreviewEdges] = useState<PreviewEdgeSpec[]>([]);
  const [hoveredTokenKey, setHoveredTokenKey] = useState<string | null>(null);
  const [pinnedTokenKey, setPinnedTokenKey] = useState<string | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoState>(null);

  const hoverTimersRef = useRef<HoverIntentTimers>(emptyHoverTimers());
  const hoveredTokenKeyRef = useRef<string | null>(null);
  const pinnedTokenKeyRef = useRef<string | null>(null);
  const pinnedPreviewEdgesRef = useRef<PreviewEdgeSpec[]>([]);
  const pendingFireRef = useRef<{ tokenKey: string; onFire: () => void } | null>(
    null,
  );
  const hoverClearRef = useRef<{ tokenKey: string; onClear: () => void } | null>(
    null,
  );

  const endTrace = useCallback(() => {
    setHoverPreviewEdges([]);
    setHoveredTokenKey(null);
    setIsWarm(false);
    clearJumpTooltip();
  }, []);

  const endHoverPreview = useCallback(() => {
    if (pinnedTokenKeyRef.current != null) {
      hoveredTokenKeyRef.current = null;
      setHoveredTokenKey(null);
      setHoverPreviewEdges([]);
      return;
    }
    endTrace();
  }, [endTrace]);

  const beginTrace = useCallback((tokenKey: string, edges: PreviewEdgeSpec[]) => {
    setHoveredTokenKey(tokenKey);
    setIsWarm(true);
    const pinned = pinnedTokenKeyRef.current;
    if (pinned === tokenKey) {
      pinnedPreviewEdgesRef.current = edges;
      setPinnedPreviewEdges(edges);
      setHoverPreviewEdges([]);
      return;
    }
    if (pinned != null) {
      setHoverPreviewEdges(edges);
      return;
    }
    setHoverPreviewEdges(edges);
  }, []);

  const resetHoverIntent = useCallback(() => {
    clearHoverTimers(hoverTimersRef.current);
    pendingFireRef.current = null;
    hoveredTokenKeyRef.current = null;
    hoverClearRef.current = null;
  }, []);

  const clearTokenInfo = useCallback(() => {
    pinnedTokenKeyRef.current = null;
    pinnedPreviewEdgesRef.current = [];
    setPinnedPreviewEdges([]);
    setTokenInfo(null);
    setPinnedTokenKey(null);
    endTrace();
    resetHoverIntent();
  }, [endTrace, resetHoverIntent]);

  const pinTrace = useCallback(
    (tokenKey: string) => {
      resetHoverIntent();
      pinnedTokenKeyRef.current = tokenKey;
      setPinnedTokenKey(tokenKey);
      setHoveredTokenKey(tokenKey);
      setIsWarm(true);
    },
    [resetHoverIntent],
  );

  const showTokenInfo = useCallback(
    (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => {
      setTokenInfo(info);
    },
    [],
  );

  const scheduleHoverFire = useCallback(
    (tokenKey: string, onFire: () => void, onClear: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.clear ?? undefined);
      clearTimeout(timers.fire ?? undefined);
      timers.clear = null;
      timers.fire = null;

      pendingFireRef.current = { tokenKey, onFire };
      hoverClearRef.current = { tokenKey, onClear };

      const runFire = () => {
        hoveredTokenKeyRef.current = tokenKey;
        setHoveredTokenKey(tokenKey);
        setIsWarm(true);
        onFire();
        pendingFireRef.current = null;
        timers.fire = null;
      };

      const delay = fireDelayMs(isWarm || hoveredTokenKey != null, isCtrlActive);
      if (delay === 0) {
        runFire();
        return;
      }

      timers.fire = setTimeout(runFire, delay);
    },
    [hoveredTokenKey, isCtrlActive, isWarm],
  );

  const scheduleHoverClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.fire ?? undefined);
      timers.fire = null;

      timers.clear = setTimeout(() => {
        if (hoveredTokenKeyRef.current === tokenKey) {
          hoveredTokenKeyRef.current = null;
          pendingFireRef.current = null;
          const pinned = pinnedTokenKeyRef.current;
          if (pinned != null) {
            setHoveredTokenKey(null);
            setHoverPreviewEdges([]);
          } else {
            setIsWarm(false);
          }
          onClear();
        }
        timers.clear = null;
      }, LEAVE_GRACE_MS);
    },
    [],
  );

  const cancelHoverLeaveGrace = useCallback(() => {
    clearTimeout(hoverTimersRef.current.clear ?? undefined);
    hoverTimersRef.current.clear = null;
  }, []);

  const scheduleHoverLeaveGrace = useCallback(() => {
    const clear = hoverClearRef.current;
    if (!clear) return;
    scheduleHoverClear(clear.tokenKey, clear.onClear);
  }, [scheduleHoverClear]);

  useEffect(() => {
    if (!isCtrlActive) return;
    const timers = hoverTimersRef.current;
    if (!timers.fire) return;
    const pending = pendingFireRef.current;
    if (!pending) return;

    clearTimeout(timers.fire);
    timers.fire = null;
    hoveredTokenKeyRef.current = pending.tokenKey;
    pending.onFire();
    pendingFireRef.current = null;
  }, [isCtrlActive]);

  const findReferences = useCallback(
    (token: string) => findSemanticReferences(token, symbols, graphData),
    [graphData, symbols],
  );

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

  useClearPinnedOnClickAway(pinnedTokenKey != null, clearTokenInfo);

  const traceTokenKey = pinnedTokenKey ?? hoveredTokenKey;
  const isTraceActive = pinnedTokenKey != null || hoveredTokenKey != null;

  const previewEdges = useMemo(() => {
    const hasParallelHover =
      pinnedTokenKey != null &&
      hoveredTokenKey != null &&
      hoveredTokenKey !== pinnedTokenKey &&
      hoverPreviewEdges.length > 0;

    if (pinnedTokenKey != null && pinnedPreviewEdges.length > 0) {
      return hasParallelHover
        ? [...pinnedPreviewEdges, ...hoverPreviewEdges]
        : pinnedPreviewEdges;
    }
    return hoverPreviewEdges;
  }, [
    hoverPreviewEdges,
    hoveredTokenKey,
    pinnedPreviewEdges,
    pinnedTokenKey,
  ]);

  const revealRevision = useMemo(() => {
    const parts: string[] = [];
    for (const node of nodes) {
      if (node.type !== "class") continue;
      const data = node.data as ClassNodeData;
      parts.push(
        `${node.id}:${data.collapsed ? "c" : "o"}:${data.expandedMethodIds.join(",")}:${data.expandedPropertyIds.join(",")}`,
      );
    }
    return parts.join("|");
  }, [nodes]);

  const indexedSymbolNames = useMemo(
    () => new Set(symbols.keys()),
    [symbols],
  );

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

  const [domRevision, setDomRevision] = useState(0);
  useLayoutEffect(() => {
    if (!traceTokenKey) return;
    setDomRevision((r) => r + 1);
  }, [revealRevision, traceTokenKey]);

  const activeHandleKinds = useMemo(() => {
    const map = new Map<string, SemanticTokenKind>();
    for (const edge of previewEdges) {
      const { from, to } = refinePreviewEdge(edge, getNode);
      if (from.type === "handle") map.set(from.handle, edge.kind);
      if (to.type === "handle") map.set(to.handle, edge.kind);
    }
    return map;
  }, [domRevision, getNode, previewEdges, revealRevision]);

  const isHandleActive = useCallback(
    (handle: string) => activeHandleKinds.has(handle),
    [activeHandleKinds],
  );

  const edgeKindAtHandle = useCallback(
    (handle: string): SemanticTokenKind | null =>
      activeHandleKinds.get(handle) ?? null,
    [activeHandleKinds],
  );

  const pinnedTraceLit = useMemo(
    () =>
      pinnedTokenKey
        ? computeTraceLit(pinnedTokenKey, pinnedPreviewEdges, getNode)
        : EMPTY_TRACE_LIT,
    [domRevision, getNode, pinnedPreviewEdges, pinnedTokenKey, revealRevision],
  );

  const hoverTraceLit = useMemo(() => {
    if (!hoveredTokenKey || hoveredTokenKey === pinnedTokenKey) return EMPTY_TRACE_LIT;
    return computeTraceLit(hoveredTokenKey, hoverPreviewEdges, getNode);
  }, [
    domRevision,
    getNode,
    hoverPreviewEdges,
    hoveredTokenKey,
    pinnedTokenKey,
    revealRevision,
  ]);

  const traceLit = useMemo(
    () => mergeTraceLit(pinnedTraceLit, hoverTraceLit),
    [hoverTraceLit, pinnedTraceLit],
  );

  const isTraceLit = useCallback(
    (traceKey: string) => traceLit.litTokenKeys.has(traceKey),
    [traceLit.litTokenKeys],
  );
  const isTraceEndpoint = useCallback(
    (traceKey: string) => traceLit.endpointTokenKeys.has(traceKey),
    [traceLit.endpointTokenKeys],
  );
  const isTraceMemberLit = useCallback(
    (memberId: string) => traceLit.litMemberIds.has(memberId),
    [traceLit.litMemberIds],
  );
  const isTraceOwnerLit = useCallback(
    (memberId: string) => traceLit.ownerLitMemberIds.has(memberId),
    [traceLit.ownerLitMemberIds],
  );
  const isTraceLineLit = useCallback(
    (memberId: string) => traceLit.litLineMemberIds.has(memberId),
    [traceLit.litLineMemberIds],
  );
  const isTraceNodeLit = useCallback(
    (flowNodeId: string) => traceLit.litFlowNodeIds.has(flowNodeId),
    [traceLit.litFlowNodeIds],
  );

  const value = useMemo(
    () => ({
      previewEdges,
      isHandleActive,
      edgeKindAtHandle,
      beginTrace,
      endTrace,
      endHoverPreview,
      isWarm,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace,
      tokenInfo,
      showTokenInfo,
      clearTokenInfo,
      isCtrlPreviewMode: isCtrlActive,
      isTraceActive,
      isTraceLit,
      isTraceEndpoint,
      isTraceMemberLit,
      isTraceOwnerLit,
      isTraceLineLit,
      isTraceNodeLit,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
      pinTrace,
      pinnedTokenKey,
      hoveredTokenKey,
      lookupIndexedUsageSites,
    }),
    [
      previewEdges,
      isHandleActive,
      edgeKindAtHandle,
      beginTrace,
      endTrace,
      endHoverPreview,
      isWarm,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace,
      tokenInfo,
      showTokenInfo,
      clearTokenInfo,
      isCtrlActive,
      isTraceActive,
      isTraceLit,
      isTraceEndpoint,
      isTraceMemberLit,
      isTraceOwnerLit,
      isTraceLineLit,
      isTraceNodeLit,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
      pinTrace,
      pinnedTokenKey,
      hoveredTokenKey,
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
