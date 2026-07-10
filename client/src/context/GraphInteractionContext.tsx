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
  LEAVE_GRACE_MS,
  type HoverIntentTimers,
} from "@/lib/hoverIntent";
import {
  edgeTouchesHandle,
  type PreviewEdgeSpec,
} from "@/lib/previewEdgeTypes";
import { computeTraceLit } from "@/lib/computeTraceLit";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
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

export type { TokenInfoState };

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
  /** Set trace key + wires in one commit (avoids staggered lit paint). */
  beginTrace: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  endTrace: () => void;
  isWarm: boolean;
  scheduleHoverFire: (tokenKey: string, onFire: () => void, onClear: () => void) => void;
  scheduleHoverClear: (tokenKey: string, onClear: () => void) => void;
  scheduleHoverLeaveGrace: () => void;
  cancelHoverLeaveGrace: () => void;
  tokenInfo: TokenInfoState;
  showTokenInfo: (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => void;
  clearTokenInfo: () => void;
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
  findReferences: (token: string) => TokenReference[];
  focusFlowNode: (flowNodeId: string) => void;
  onLoadFile: (filePath: string) => void | Promise<void>;
  graphData: GraphData | null;
  pinTrace: (tokenKey: string) => void;
  pinnedTokenKey: string | null;
  hoveredTokenKey: string | null;
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

  const [previewEdges, setPreviewEdges] = useState<PreviewEdgeSpec[]>([]);
  const [hoveredTokenKey, setHoveredTokenKey] = useState<string | null>(null);
  const [pinnedTokenKey, setPinnedTokenKey] = useState<string | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoState>(null);
  const [jumpTooltip, setJumpTooltip] = useState<JumpTooltipState>(null);

  const hoverTimersRef = useRef<HoverIntentTimers>(emptyHoverTimers());
  const hoveredTokenKeyRef = useRef<string | null>(null);
  const pendingFireRef = useRef<{ tokenKey: string; onFire: () => void } | null>(
    null,
  );
  const hoverClearRef = useRef<{ tokenKey: string; onClear: () => void } | null>(
    null,
  );

  const endTrace = useCallback(() => {
    setPreviewEdges([]);
    setHoveredTokenKey(null);
    setIsWarm(false);
    setJumpTooltip(null);
  }, []);

  const beginTrace = useCallback((tokenKey: string, edges: PreviewEdgeSpec[]) => {
    setHoveredTokenKey(tokenKey);
    setPreviewEdges(edges);
    setIsWarm(true);
  }, []);

  const resetHoverIntent = useCallback(() => {
    clearHoverTimers(hoverTimersRef.current);
    pendingFireRef.current = null;
    hoveredTokenKeyRef.current = null;
    hoverClearRef.current = null;
  }, []);

  const clearTokenInfo = useCallback(() => {
    setTokenInfo(null);
    setPinnedTokenKey(null);
    endTrace();
    resetHoverIntent();
  }, [endTrace, resetHoverIntent]);

  const pinTrace = useCallback((tokenKey: string) => {
    setPinnedTokenKey(tokenKey);
    setHoveredTokenKey(tokenKey);
    setIsWarm(true);
  }, []);

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
      if (pinnedTokenKey) return;

      const timers = hoverTimersRef.current;
      clearTimeout(timers.fire ?? undefined);
      timers.fire = null;

      timers.clear = setTimeout(() => {
        if (hoveredTokenKeyRef.current === tokenKey) {
          hoveredTokenKeyRef.current = null;
          pendingFireRef.current = null;
          setIsWarm(false);
          onClear();
        }
        timers.clear = null;
      }, LEAVE_GRACE_MS);
    },
    [pinnedTokenKey],
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
      void setCenter(node.position.x + w / 2, node.position.y + h / 2, {
        zoom: 1.15,
        duration: 350,
      });
    },
    [getNode, nodes, setCenter, setNodes],
  );

  const traceTokenKey = pinnedTokenKey ?? hoveredTokenKey;
  const isTraceActive = traceTokenKey != null;

  const traceLit = useMemo(
    () => computeTraceLit(traceTokenKey, previewEdges),
    [traceTokenKey, previewEdges],
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
      isWarm,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace,
      tokenInfo,
      showTokenInfo,
      clearTokenInfo,
      jumpTooltip,
      setJumpTooltip,
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
    }),
    [
      previewEdges,
      isHandleActive,
      edgeKindAtHandle,
      beginTrace,
      endTrace,
      isWarm,
      scheduleHoverFire,
      scheduleHoverClear,
      scheduleHoverLeaveGrace,
      cancelHoverLeaveGrace,
      tokenInfo,
      showTokenInfo,
      clearTokenInfo,
      jumpTooltip,
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
