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
  enrichCallSites,
  offCanvasCallSiteFiles,
  projectReferencesForToken,
  type CallSiteReference,
} from "@/lib/projectReferences";
import { collectGraphFilePaths } from "@/lib/graphFiles";
import {
  findSemanticReferences,
  type TokenReference,
} from "@/lib/semanticLookup";
import {
  clearHoverTimers,
  emptyHoverTimers,
  fireDelayMs,
  INFO_DELAY_MS,
  LEAVE_GRACE_MS,
  shouldCommitHoverClear,
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
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { buildUsageSiteIndex, type UsageSiteRecord } from "@/lib/usageSiteIndex";
import {
  applyPinGesture,
  mergePinnedEdges,
  pinnedKeys,
  updatePinnedEdges,
  updatePinnedInfo,
  type PinnedTrace,
} from "@/lib/pinnedTraces";
import { rebuildTraceEdgesForKey } from "@/lib/rebuildTraceEdges";
import { applyTraceLit, clearTraceLit } from "@/lib/traceLitController";
import { useElementRegistryRevision } from "@/hooks/useElementRegistry";
import { notifyWireTransform } from "@/lib/wireEngine";
import {
  buildStructuralEdges,
  mountedClassGraphIds,
} from "@/lib/buildStructuralEdges";
import { buildTransitiveEdges } from "@/lib/buildTransitiveEdges";
import {
  DEFAULT_VISIBLE_EDGE_KINDS,
  structuralTypesForVisibleKinds,
} from "@/lib/connectionVisibility";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
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

type PinSnapshot = {
  traces: PinnedTrace[];
  activePinKey: string | null;
  tokenInfo: TokenInfoState;
};

/** Caps memory use; deep back-tracking beyond this isn't a realistic use case. */
const PIN_HISTORY_LIMIT = 20;

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
  const isCtrlActiveRef = useRef(isCtrlActive);
  isCtrlActiveRef.current = isCtrlActive;
  const { symbols, references } = useIndex();
  const { setCenter, getNode } = useReactFlow();
  // Recompute trace-lit when the mounted-trace-host set changes (a member or
  // class expanding/collapsing), so newly revealed tokens light up.
  const registryRevision = useElementRegistryRevision();

  const [hoverPreviewEdges, setHoverPreviewEdges] = useState<PreviewEdgeSpec[]>([]);
  const [pinnedTraces, setPinnedTraces] = useState<PinnedTrace[]>([]);
  const [activePinKey, setActivePinKey] = useState<string | null>(null);
  const [hoveredTokenKey, setHoveredTokenKey] = useState<string | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoState>(null);
  const [connectionMenu, setConnectionMenu] = useState<TokenConnectionMenuState | null>(
    null,
  );
  const [pinHistoryLength, setPinHistoryLength] = useState(0);
  const [visibleEdgeKinds, setVisibleEdgeKinds] = useState<Set<ConnectionKind>>(
    () => new Set(DEFAULT_VISIBLE_EDGE_KINDS),
  );
  const [pulseEdges, setPulseEdges] = useState<StructuralEdgeSpec[]>([]);
  const transitiveHopDepth = 2;

  const hoverTimersRef = useRef<HoverIntentTimers>(emptyHoverTimers());
  const hoveredTokenKeyRef = useRef<string | null>(null);
  const pinnedTracesRef = useRef<PinnedTrace[]>([]);
  const activePinKeyRef = useRef<string | null>(null);
  const tokenInfoRef = useRef<TokenInfoState>(null);
  tokenInfoRef.current = tokenInfo;
  const pinHistoryRef = useRef<PinSnapshot[]>([]);
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
    setConnectionMenu(null);
    clearJumpTooltip();
  }, []);

  const clearConnectionMenu = useCallback(() => {
    setConnectionMenu(null);
  }, []);

  const showConnectionMenu = useCallback((state: TokenConnectionMenuState) => {
    setConnectionMenu(state);
  }, []);

  const endHoverPreview = useCallback(() => {
    if (pinnedTracesRef.current.length > 0) {
      hoveredTokenKeyRef.current = null;
      setHoveredTokenKey(null);
      setHoverPreviewEdges([]);
      setConnectionMenu(null);
      if (!tokenInfo?.pinned) setTokenInfo(null);
      return;
    }
    endTrace();
    if (!tokenInfo?.pinned) setTokenInfo(null);
  }, [endTrace, tokenInfo?.pinned]);

  const beginTrace = useCallback((tokenKey: string, edges: PreviewEdgeSpec[]) => {
    setHoveredTokenKey(tokenKey);
    setIsWarm(true);
    const pin = pinnedTracesRef.current.find((t) => t.tokenKey === tokenKey);
    if (pin) {
      const updated = updatePinnedEdges(pinnedTracesRef.current, tokenKey, edges);
      pinnedTracesRef.current = updated;
      setPinnedTraces(updated);
      setHoverPreviewEdges([]);
      return;
    }
    if (pinnedTracesRef.current.length > 0) {
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

  const pushPinHistory = useCallback(() => {
    if (pinnedTracesRef.current.length === 0) return;
    const history = pinHistoryRef.current;
    history.push({
      traces: pinnedTracesRef.current,
      activePinKey: activePinKeyRef.current,
      tokenInfo: tokenInfoRef.current,
    });
    if (history.length > PIN_HISTORY_LIMIT) history.shift();
    setPinHistoryLength(history.length);
  }, []);

  const clearTokenInfo = useCallback(() => {
    pushPinHistory();
    pinnedTracesRef.current = [];
    activePinKeyRef.current = null;
    setPinnedTraces([]);
    setActivePinKey(null);
    setTokenInfo(null);
    endTrace();
    resetHoverIntent();
  }, [endTrace, pushPinHistory, resetHoverIntent]);

  const goBackPin = useCallback(() => {
    const history = pinHistoryRef.current;
    const snapshot = history.pop();
    setPinHistoryLength(history.length);
    if (!snapshot) return;

    resetHoverIntent();
    pinnedTracesRef.current = snapshot.traces;
    activePinKeyRef.current = snapshot.activePinKey;
    setPinnedTraces(snapshot.traces);
    setActivePinKey(snapshot.activePinKey);
    setTokenInfo(snapshot.tokenInfo);
    if (snapshot.activePinKey) {
      setHoveredTokenKey(snapshot.activePinKey);
      setIsWarm(true);
    } else {
      endTrace();
    }
  }, [endTrace, resetHoverIntent]);

  const pinTrace = useCallback(
    (tokenKey: string, shiftKey = false) => {
      pushPinHistory();
      resetHoverIntent();
      const mode = shiftKey
        ? pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey)
          ? "toggle"
          : "accumulate"
        : "replace";
      const { traces, activeKey } = applyPinGesture(
        pinnedTracesRef.current,
        tokenKey,
        mode,
      );
      pinnedTracesRef.current = traces;
      activePinKeyRef.current = activeKey;
      setPinnedTraces(traces);
      setActivePinKey(activeKey);
      if (activeKey) {
        setHoveredTokenKey(activeKey);
        setIsWarm(true);
      } else {
        setTokenInfo(null);
        endTrace();
      }
    },
    [endTrace, pushPinHistory, resetHoverIntent],
  );

  const showTokenInfo = useCallback(
    (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => {
      setTokenInfo(info);
      if (info.pinned && activePinKeyRef.current) {
        const key = activePinKeyRef.current;
        const updated = updatePinnedInfo(
          pinnedTracesRef.current,
          key,
          { ...info, pinned: true },
        );
        pinnedTracesRef.current = updated;
        setPinnedTraces(updated);
      }
    },
    [],
  );

  const handleSetActivePinKey = useCallback((tokenKey: string) => {
    if (!pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey)) return;
    activePinKeyRef.current = tokenKey;
    setActivePinKey(tokenKey);
    const pin = pinnedTracesRef.current.find((t) => t.tokenKey === tokenKey);
    if (pin?.info) {
      setTokenInfo(pin.info);
    }
  }, []);

  const isPinnedTokenKey = useCallback(
    (tokenKey: string) =>
      pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey),
    [],
  );

  const scheduleHoverFire = useCallback(
    (
      tokenKey: string,
      onFire: () => void,
      onClear: () => void,
      onInfo?: () => void,
    ) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.clear ?? undefined);
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.clear = null;
      timers.fire = null;
      timers.info = null;

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

      const delay = fireDelayMs(
        isWarm || hoveredTokenKey != null,
        isCtrlActiveRef.current,
      );
      if (delay === 0) {
        runFire();
      } else {
        timers.fire = setTimeout(runFire, delay);
      }

      if (onInfo) {
        timers.info = setTimeout(() => {
          if (
            hoveredTokenKeyRef.current === tokenKey &&
            !pinnedTracesRef.current.some((t) => t.tokenKey === tokenKey)
          ) {
            onInfo();
          }
          timers.info = null;
        }, INFO_DELAY_MS);
      }
    },
    [hoveredTokenKey, isWarm],
  );

  const scheduleHoverClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.fire = null;
      timers.info = null;

      timers.clear = setTimeout(() => {
        if (!shouldCommitHoverClear(tokenKey, hoverClearRef.current)) {
          timers.clear = null;
          return;
        }
        clearTimeout(timers.fire ?? undefined);
        timers.fire = null;
        timers.info = null;
        hoveredTokenKeyRef.current = null;
        pendingFireRef.current = null;
        hoverClearRef.current = null;
        onClear();
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
    if (!isCtrlActive) {
      setConnectionMenu(null);
      return;
    }
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

  const graphFilePaths = useMemo(
    () => collectGraphFilePaths(graphData),
    [graphData],
  );

  const lookupProjectReferences = useCallback(
    (token: string) => projectReferencesForToken(references, token),
    [references],
  );

  const lookupOffCanvasCallSiteFiles = useCallback(
    (token: string) =>
      offCanvasCallSiteFiles(
        projectReferencesForToken(references, token),
        graphFilePaths,
      ),
    [graphFilePaths, references],
  );

  const findCallSites = useCallback(
    (token: string) =>
      enrichCallSites(
        projectReferencesForToken(references, token),
        graphFilePaths,
      ),
    [graphFilePaths, references],
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

  useClearPinnedOnClickAway(pinnedTraces.length > 0, clearTokenInfo);

  const pinnedPreviewEdges = useMemo(
    () => mergePinnedEdges(pinnedTraces),
    [pinnedTraces],
  );
  const pinnedTokenKey = activePinKey;

  const indexedSymbolNames = useMemo(
    () => new Set(symbols.keys()),
    [symbols],
  );

  const usageSiteIndex = useMemo(
    () => buildUsageSiteIndex(nodes, indexedSymbolNames),
    [indexedSymbolNames, nodes],
  );

  const traceTokenKey =
    activePinKey ?? hoveredTokenKey ?? pinnedTraces[0]?.tokenKey ?? null;
  const isTraceActive =
    pinnedTraces.length > 0 || hoveredTokenKey != null;

  const previewEdges = useMemo(() => {
    const hasParallelHover =
      pinnedTraces.length > 0 &&
      hoveredTokenKey != null &&
      !pinnedKeys(pinnedTraces).includes(hoveredTokenKey) &&
      hoverPreviewEdges.length > 0;

    let edges: PreviewEdgeSpec[];
    if (pinnedPreviewEdges.length > 0) {
      edges = hasParallelHover
        ? [...pinnedPreviewEdges, ...hoverPreviewEdges]
        : pinnedPreviewEdges;
    } else {
      edges = hoverPreviewEdges;
    }

    if (traceTokenKey && graphData && edges.length > 0) {
      const transitive = buildTransitiveEdges(
        traceTokenKey,
        graphData,
        usageSiteIndex,
        transitiveHopDepth,
        getNode,
        symbols,
      );
      if (transitive.length > 0) {
        edges = [...edges, ...transitive];
      }
    }

    if (!visibleEdgeKinds.has("usage")) return [];

    return edges;
  }, [
    graphData,
    getNode,
    hoverPreviewEdges,
    hoveredTokenKey,
    pinnedPreviewEdges,
    pinnedTraces,
    traceTokenKey,
    usageSiteIndex,
    symbols,
    visibleEdgeKinds,
  ]);

  const mountedGraphIds = useMemo(() => {
    const flowIds = new Set(nodes.map((n) => n.id));
    return mountedClassGraphIds(graphData, flowIds);
  }, [graphData, nodes]);

  const visibleStructuralTypes = useMemo(
    () => structuralTypesForVisibleKinds(visibleEdgeKinds),
    [visibleEdgeKinds],
  );

  const structuralEdges = useMemo(
    () => buildStructuralEdges(graphData, mountedGraphIds, visibleStructuralTypes),
    [graphData, mountedGraphIds, visibleStructuralTypes],
  );

  const isEdgeKindVisible = useCallback(
    (kind: ConnectionKind) => visibleEdgeKinds.has(kind),
    [visibleEdgeKinds],
  );

  const toggleEdgeKind = useCallback((kind: ConnectionKind) => {
    setVisibleEdgeKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

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

  const applyLoadTraceRebuild = useCallback(() => {
    if (!graphData) return;

    const hoverKey = hoveredTokenKeyRef.current;
    if (hoverKey) {
      setHoverPreviewEdges((prev) => {
        if (!prev.some((e) => e.load)) return prev;
        const rebuilt = rebuildTraceEdgesForKey(
          hoverKey,
          prev,
          symbols,
          graphData,
          getNode,
        );
        return rebuilt ?? prev;
      });
    }

    setPinnedTraces((prev) => {
      let changed = false;
      const next = prev.map((trace) => {
        if (!trace.edges.some((e) => e.load)) return trace;
        const rebuilt = rebuildTraceEdgesForKey(
          trace.tokenKey,
          trace.edges,
          symbols,
          graphData,
          getNode,
        );
        if (!rebuilt) return trace;
        changed = true;
        return { ...trace, edges: rebuilt };
      });
      if (changed) {
        pinnedTracesRef.current = next;
      }
      return changed ? next : prev;
    });
  }, [getNode, graphData, symbols]);

  useLayoutEffect(() => {
    const pendingLoad =
      hoverPreviewEdges.some((e) => e.load) ||
      pinnedTraces.some((t) => t.edges.some((e) => e.load));
    if (!graphData || !pendingLoad) return;

    let outerRaf = 0;
    outerRaf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyLoadTraceRebuild();
      });
    });

    return () => cancelAnimationFrame(outerRaf);
  }, [
    applyLoadTraceRebuild,
    getNode,
    graphData,
    hoverPreviewEdges,
    pinnedTraces,
    revealRevision,
    symbols,
  ]);

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

  const activeHandleKinds = useMemo(() => {
    const map = new Map<string, SemanticTokenKind>();
    for (const edge of previewEdges) {
      const { from, to } = refinePreviewEdge(edge, getNode);
      if (from.type === "handle") map.set(from.handle, edge.kind);
      if (to.type === "handle") map.set(to.handle, edge.kind);
    }
    return map;
  }, [getNode, previewEdges, revealRevision]);

  const isHandleActive = useCallback(
    (handle: string) => activeHandleKinds.has(handle),
    [activeHandleKinds],
  );

  const edgeKindAtHandle = useCallback(
    (handle: string): SemanticTokenKind | null =>
      activeHandleKinds.get(handle) ?? null,
    [activeHandleKinds],
  );

  const pinnedTraceLit = useMemo(() => {
    let lit = EMPTY_TRACE_LIT;
    for (const trace of pinnedTraces) {
      lit = mergeTraceLit(
        lit,
        computeTraceLit(trace.tokenKey, trace.edges, getNode),
      );
    }
    return lit;
  }, [getNode, pinnedTraces, revealRevision, registryRevision]);

  const hoverTraceLit = useMemo(() => {
    if (!hoveredTokenKey) return EMPTY_TRACE_LIT;
    if (pinnedKeys(pinnedTraces).includes(hoveredTokenKey)) {
      return EMPTY_TRACE_LIT;
    }
    return computeTraceLit(hoveredTokenKey, hoverPreviewEdges, getNode);
  }, [
    getNode,
    hoverPreviewEdges,
    hoveredTokenKey,
    pinnedTraces,
    revealRevision,
    registryRevision,
  ]);

  const traceLit = useMemo(
    () => mergeTraceLit(pinnedTraceLit, hoverTraceLit),
    [hoverTraceLit, pinnedTraceLit],
  );

  const pinnedTokenKeySet = useMemo(
    () => new Set(pinnedKeys(pinnedTraces)),
    [pinnedTraces],
  );

  useLayoutEffect(() => {
    if (!traceTokenKey) {
      clearTraceLit();
      return;
    }
    applyTraceLit(traceLit, {
      pinnedTokenKeys: pinnedTokenKeySet,
      hoveredTokenKey,
    });
    notifyWireTransform();
  }, [hoveredTokenKey, pinnedTokenKeySet, traceLit, traceTokenKey]);

  const value = useMemo(
    () => ({
      previewEdges,
      structuralEdges,
      pulseEdges,
      visibleEdgeKinds,
      isEdgeKindVisible,
      toggleEdgeKind,
      transitiveHopDepth,
      setPulseEdges,
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
      isTraceActive,
      findReferences,
      findCallSites,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
      focusFlowNode,
      focusReadingMember: onFocusReadingMember ?? (() => {}),
      onLoadFile,
      refreshLoadTraces: applyLoadTraceRebuild,
      graphData,
      pinTrace,
      pinnedTokenKey,
      pinnedTraces,
      activePinKey,
      setActivePinKey: handleSetActivePinKey,
      isPinnedTokenKey,
      hoveredTokenKey,
      lookupIndexedUsageSites,
      goBackPin,
      canGoBackPin: pinHistoryLength > 0,
      connectionMenu,
      showConnectionMenu,
      clearConnectionMenu,
    }),
    [
      previewEdges,
      structuralEdges,
      pulseEdges,
      visibleEdgeKinds,
      isEdgeKindVisible,
      toggleEdgeKind,
      transitiveHopDepth,
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
      isTraceActive,
      findReferences,
      findCallSites,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
      focusFlowNode,
      onFocusReadingMember,
      onLoadFile,
      applyLoadTraceRebuild,
      graphData,
      pinTrace,
      pinnedTokenKey,
      pinnedTraces,
      activePinKey,
      handleSetActivePinKey,
      isPinnedTokenKey,
      hoveredTokenKey,
      lookupIndexedUsageSites,
      goBackPin,
      pinHistoryLength,
      connectionMenu,
      showConnectionMenu,
      clearConnectionMenu,
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
