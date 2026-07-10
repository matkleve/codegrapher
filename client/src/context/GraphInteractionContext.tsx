import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  INFO_DELAY_MS,
  LEAVE_GRACE_MS,
  type HoverIntentTimers,
} from "@/lib/hoverIntent";
import {
  edgeTouchesHandle,
  type PreviewEdgeSpec,
} from "@/lib/previewEdgeTypes";
import { computeTraceLit } from "@/lib/computeTraceLit";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import type { GraphData } from "@/types";

export type { PreviewEdgeSpec, AnchorRef } from "@/lib/previewEdgeTypes";
export { edgeTouchesHandle } from "@/lib/previewEdgeTypes";

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

export type TokenInfoState = {
  token: string;
  kind: SemanticTokenKind;
  anchor: AnchorRect;
  pinned: boolean;
  connectionCount: number;
  definedIn: string;
} | null;

export type TokenDropdownState = {
  token: string;
  x: number;
  y: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
  line: number;
} | null;

export type JumpTooltipState = {
  token: string;
  kind: SemanticTokenKind;
  x: number;
  y: number;
} | null;

type GraphInteractionContextValue = {
  previewEdges: PreviewEdgeSpec[];
  isHandleActive: (handle: string) => boolean;
  edgeKindAtHandle: (handle: string) => SemanticTokenKind | null;
  setPreviewEdges: (edges: PreviewEdgeSpec[]) => void;
  clearPreviewEdges: () => void;
  activeTokenKey: string | null;
  setActiveTokenKey: (key: string | null) => void;
  isWarm: boolean;
  scheduleHoverFire: (tokenKey: string, onFire: () => void) => void;
  scheduleHoverClear: (tokenKey: string, onClear: () => void) => void;
  scheduleInfoOpen: (tokenKey: string, onOpen: () => void) => void;
  cancelHoverTimers: () => void;
  tokenInfo: TokenInfoState;
  showTokenInfo: (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => void;
  clearTokenInfo: () => void;
  unpinTokenInfo: () => void;
  jumpTooltip: JumpTooltipState;
  setJumpTooltip: (state: JumpTooltipState) => void;
  isCtrlPreviewMode: boolean;
  isTraceActive: boolean;
  isTraceLit: (traceKey: string) => boolean;
  isTraceEndpoint: (traceKey: string) => boolean;
  isTraceMemberLit: (memberId: string) => boolean;
  isTraceOwnerLit: (memberId: string) => boolean;
  isTraceLineLit: (memberId: string) => boolean;
  isTraceNodeLit: (flowNodeId: string) => boolean;
  tokenDropdown: TokenDropdownState;
  setTokenDropdown: (state: TokenDropdownState) => void;
  findReferences: (token: string) => TokenReference[];
  focusFlowNode: (flowNodeId: string) => void;
  onLoadFile: (filePath: string) => void | Promise<void>;
  graphData: GraphData | null;
  dismissTransient: () => void;
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
  const { isCtrlHeld } = useCtrlKey();
  const { symbols } = useIndex();
  const { setCenter, getNode } = useReactFlow();
  const [previewEdges, setPreviewEdgesState] = useState<PreviewEdgeSpec[]>([]);
  const [activeTokenKey, setActiveTokenKey] = useState<string | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoState>(null);
  const [jumpTooltip, setJumpTooltip] = useState<JumpTooltipState>(null);
  const [tokenDropdown, setTokenDropdown] = useState<TokenDropdownState>(null);
  const hoverTimersRef = useRef<HoverIntentTimers>(emptyHoverTimers());
  const hoveredTokenKeyRef = useRef<string | null>(null);

  const clearPreviewEdges = useCallback(() => {
    setPreviewEdgesState([]);
    setIsWarm(false);
    setJumpTooltip(null);
  }, []);

  const dismissTransient = useCallback(() => {
    clearPreviewEdges();
    setActiveTokenKey(null);
    setJumpTooltip(null);
    if (tokenInfo && !tokenInfo.pinned) setTokenInfo(null);
  }, [clearPreviewEdges, tokenInfo]);

  const clearTokenInfo = useCallback(() => {
    setTokenInfo(null);
  }, []);

  const unpinTokenInfo = useCallback(() => {
    setTokenInfo((prev) => (prev ? { ...prev, pinned: false } : null));
  }, []);

  const showTokenInfo = useCallback(
    (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => {
      setTokenInfo(info);
    },
    [],
  );

  const cancelHoverTimers = useCallback(() => {
    clearHoverTimers(hoverTimersRef.current);
  }, []);

  const scheduleHoverFire = useCallback(
    (tokenKey: string, onFire: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.clear ?? undefined);
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.clear = null;
      timers.fire = null;
      timers.info = null;

      const delay = fireDelayMs(isWarm || activeTokenKey != null, isCtrlHeld);
      if (delay === 0) {
        hoveredTokenKeyRef.current = tokenKey;
        setIsWarm(true);
        onFire();
        return;
      }

      timers.fire = setTimeout(() => {
        hoveredTokenKeyRef.current = tokenKey;
        setIsWarm(true);
        onFire();
        timers.fire = null;
      }, delay);
    },
    [activeTokenKey, isCtrlHeld, isWarm],
  );

  const scheduleHoverClear = useCallback(
    (tokenKey: string, onClear: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.fire ?? undefined);
      clearTimeout(timers.info ?? undefined);
      timers.fire = null;
      timers.info = null;

      timers.clear = setTimeout(() => {
        if (hoveredTokenKeyRef.current === tokenKey) {
          hoveredTokenKeyRef.current = null;
          setIsWarm(false);
          onClear();
        }
        if (!tokenInfo?.pinned) setTokenInfo(null);
        timers.clear = null;
      }, LEAVE_GRACE_MS);
    },
    [tokenInfo?.pinned],
  );

  const scheduleInfoOpen = useCallback(
    (tokenKey: string, onOpen: () => void) => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.info ?? undefined);
      if (isCtrlHeld) return;

      timers.info = setTimeout(() => {
        if (hoveredTokenKeyRef.current === tokenKey && !tokenInfo?.pinned) {
          onOpen();
        }
        timers.info = null;
      }, INFO_DELAY_MS);
    },
    [isCtrlHeld, tokenInfo?.pinned],
  );

  const setPreviewEdges = useCallback((edges: PreviewEdgeSpec[]) => {
    setPreviewEdgesState(edges);
    if (edges.length > 0) setIsWarm(true);
  }, []);

  useEffect(() => {
    if (!isCtrlHeld) setTokenDropdown(null);
  }, [isCtrlHeld]);

  const isHandleActive = useCallback(
    (handle: string) => previewEdges.some((e) => edgeTouchesHandle(e, handle)),
    [previewEdges],
  );

  const edgeKindAtHandle = useCallback(
    (handle: string): SemanticTokenKind | null => {
      const edge = previewEdges.find((e) => edgeTouchesHandle(e, handle));
      return edge?.kind ?? null;
    },
    [previewEdges],
  );

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
      const cx = node.position.x + w / 2;
      const cy = node.position.y + h / 2;
      void setCenter(cx, cy, { zoom: 1.15, duration: 350 });
      setTokenDropdown(null);
      clearPreviewEdges();
      setActiveTokenKey(null);
    },
    [clearPreviewEdges, getNode, nodes, setCenter, setNodes],
  );

  const isCtrlPreviewMode = isCtrlHeld;
  const isTraceActive = activeTokenKey != null;

  const traceLit = useMemo(
    () => computeTraceLit(activeTokenKey, previewEdges),
    [activeTokenKey, previewEdges],
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
      setPreviewEdges,
      clearPreviewEdges,
      activeTokenKey,
      setActiveTokenKey,
      isWarm,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleInfoOpen,
      cancelHoverTimers,
      tokenInfo,
      showTokenInfo,
      clearTokenInfo,
      unpinTokenInfo,
      jumpTooltip,
      setJumpTooltip,
      isCtrlPreviewMode,
      isTraceActive,
      isTraceLit,
      isTraceEndpoint,
      isTraceMemberLit,
      isTraceOwnerLit,
      isTraceLineLit,
      isTraceNodeLit,
      tokenDropdown,
      setTokenDropdown,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
      dismissTransient,
    }),
    [
      previewEdges,
      isHandleActive,
      edgeKindAtHandle,
      setPreviewEdges,
      clearPreviewEdges,
      activeTokenKey,
      isWarm,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleInfoOpen,
      cancelHoverTimers,
      tokenInfo,
      showTokenInfo,
      clearTokenInfo,
      unpinTokenInfo,
      jumpTooltip,
      isCtrlPreviewMode,
      isTraceActive,
      isTraceLit,
      isTraceEndpoint,
      isTraceMemberLit,
      isTraceOwnerLit,
      isTraceLineLit,
      isTraceNodeLit,
      tokenDropdown,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
      dismissTransient,
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