import { useCallback, useRef, useState, type RefObject } from "react";
import type { PinnedTrace } from "@/lib/pinnedTraces";
import { clearJumpTooltip } from "@/context/JumpTooltipContext";
import { useHoverIntentTimers } from "@/hooks/useHoverIntentTimers";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import {
  clearTraceAnchorHost,
  unlockTraceAnchorPreference,
} from "@/lib/memberDefAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

type AnchorTrace = {
  tokenKey: string;
  edges: PreviewEdgeSpec[];
};

export type TraceHoverPinRefs = {
  pinnedTracesRef: RefObject<PinnedTrace[]>;
  isPinnedTokenKey: (tokenKey: string) => boolean;
  updatePinnedTraceEdges: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  clearUnpinnedTokenInfo: () => void;
};

export function useTraceHoverState(
  isCtrlActive: boolean,
  pin: TraceHoverPinRefs,
) {
  const {
    pinnedTracesRef,
    isPinnedTokenKey,
    updatePinnedTraceEdges,
    clearUnpinnedTokenInfo,
  } = pin;

  const [hoverPreviewEdges, setHoverPreviewEdges] = useState<PreviewEdgeSpec[]>([]);
  const [anchorTrace, setAnchorTrace] = useState<AnchorTrace | null>(null);
  const [hoveredTokenKey, setHoveredTokenKey] = useState<string | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [connectionMenu, setConnectionMenu] = useState<TokenConnectionMenuState | null>(
    null,
  );

  const hoverPreviewEdgesRef = useRef<PreviewEdgeSpec[]>([]);
  hoverPreviewEdgesRef.current = hoverPreviewEdges;
  const lastTraceKeyRef = useRef<string | null>(null);
  const lastTraceEdgesRef = useRef<PreviewEdgeSpec[]>([]);

  const clearConnectionMenu = useCallback(() => {
    setConnectionMenu(null);
  }, []);

  const showConnectionMenu = useCallback((state: TokenConnectionMenuState) => {
    setConnectionMenu(state);
  }, []);

  const clearAnchorTrace = useCallback(() => {
    setAnchorTrace(null);
  }, []);

  const clearLastTraceRefs = useCallback(() => {
    lastTraceKeyRef.current = null;
    lastTraceEdgesRef.current = [];
  }, []);

  const endTrace = useCallback(() => {
    setHoverPreviewEdges([]);
    setAnchorTrace(null);
    clearLastTraceRefs();
    setHoveredTokenKey(null);
    setIsWarm(false);
    setConnectionMenu(null);
    clearTraceAnchorHost();
    unlockTraceAnchorPreference();
    clearJumpTooltip();
  }, [clearLastTraceRefs]);

  const beginTrace = useCallback(
    (tokenKey: string, edges: PreviewEdgeSpec[]) => {
      setHoveredTokenKey(tokenKey);
      setIsWarm(true);
      if (isPinnedTokenKey(tokenKey)) {
        updatePinnedTraceEdges(tokenKey, edges);
        setHoverPreviewEdges([]);
        return;
      }

      setAnchorTrace((anchor) => {
        const priorKey = lastTraceKeyRef.current;
        const priorEdges = lastTraceEdgesRef.current;
        if (
          priorKey &&
          priorKey !== tokenKey &&
          priorEdges.length > 0 &&
          !pinnedTracesRef.current.some((t) => t.tokenKey === priorKey)
        ) {
          return { tokenKey: priorKey, edges: priorEdges };
        }
        return anchor;
      });

      lastTraceKeyRef.current = tokenKey;
      lastTraceEdgesRef.current = edges;
      setHoverPreviewEdges(edges);
    },
    [isPinnedTokenKey, pinnedTracesRef, updatePinnedTraceEdges],
  );

  const beginHoverVisualLeave = useCallback(() => {
    if (pinnedTracesRef.current.length > 0) {
      setHoveredTokenKey(null);
      setHoverPreviewEdges([]);
      setConnectionMenu(null);
      return;
    }
    setHoveredTokenKey(null);
    setHoverPreviewEdges([]);
    setAnchorTrace(null);
    clearJumpTooltip();
  }, [pinnedTracesRef]);

  const {
    hoveredTokenKeyRef,
    resetHoverIntent,
    scheduleHoverFire,
    scheduleHoverClear,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
  } = useHoverIntentTimers({
    isCtrlActive,
    isWarm,
    hoveredTokenKey,
    isTokenPinned: isPinnedTokenKey,
    setHoveredTokenKey,
    setIsWarm,
    onCtrlRelease: clearConnectionMenu,
    onVisualLeave: beginHoverVisualLeave,
  });

  const endHoverPreview = useCallback(() => {
    if (pinnedTracesRef.current.length > 0) {
      hoveredTokenKeyRef.current = null;
      setHoveredTokenKey(null);
      setHoverPreviewEdges([]);
      setConnectionMenu(null);
      clearUnpinnedTokenInfo();
      return;
    }
    endTrace();
    clearUnpinnedTokenInfo();
  }, [clearUnpinnedTokenInfo, endTrace, hoveredTokenKeyRef, pinnedTracesRef]);

  return {
    hoverPreviewEdges,
    anchorTrace,
    hoveredTokenKey,
    hoveredTokenKeyRef,
    isWarm,
    connectionMenu,
    setHoverPreviewEdges,
    beginTrace,
    endTrace,
    endHoverPreview,
    clearAnchorTrace,
    clearLastTraceRefs,
    resetHoverIntent,
    scheduleHoverFire,
    scheduleHoverClear,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
    showConnectionMenu,
    clearConnectionMenu,
    setHoveredTokenKey,
    setIsWarm,
  };
}
