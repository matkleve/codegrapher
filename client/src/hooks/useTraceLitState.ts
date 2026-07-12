import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { computeTraceLit, EMPTY_TRACE_LIT, mergeTraceLit } from "@/lib/computeTraceLit";
import { filterPreviewEdgesByVisibility } from "@/lib/connectionVisibility";
import { pinnedKeys, type PinnedTrace } from "@/lib/pinnedTraces";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import {
  applyActiveTraceLit,
  clearTraceLitTimer,
  syncHoverPreviewEdgeIds,
} from "@/lib/traceLitApply";
import { subscribeTraceStrength } from "@/lib/wireHoverBoost";

type UseTraceLitStateArgs = {
  previewEdges: PreviewEdgeSpec[];
  hoverPreviewEdges: PreviewEdgeSpec[];
  pinnedTraces: PinnedTrace[];
  pinnedTokenKeySet: ReadonlySet<string>;
  hoveredTokenKey: string | null;
  emphasisTokenKey: string | null;
  traceTokenKey: string | null;
  visibleEdgeKinds: ReadonlySet<ConnectionKind>;
  getNode: (id: string) => Node | undefined;
  revealRevision: string;
  registryRevision: number;
  onFadeComplete?: () => void;
};

/**
 * Resolves which DOM handles/chips should render "lit" (active) and applies
 * that to the DOM directly (`applyTraceLit`) — the graph-wide visual state
 * that follows the current hover/pin trace.
 */
export function useTraceLitState({
  previewEdges,
  hoverPreviewEdges,
  pinnedTraces,
  pinnedTokenKeySet,
  hoveredTokenKey,
  emphasisTokenKey,
  traceTokenKey,
  visibleEdgeKinds,
  getNode,
  revealRevision,
  registryRevision,
  onFadeComplete,
}: UseTraceLitStateArgs) {
  const refineCacheRef = useRef(createRefinePreviewEdgeCache());
  const lastApplyRef = useRef({ fingerprint: "", hovered: "", strength: 0 });
  const clearLitTimerRef = useRef(0);
  const fadingLitRef = useRef(false);
  const [strengthRevision, setStrengthRevision] = useState(0);

  useLayoutEffect(() => subscribeTraceStrength(() => setStrengthRevision((n) => n + 1)), []);

  useLayoutEffect(() => {
    syncHoverPreviewEdgeIds(
      emphasisTokenKey ?? hoveredTokenKey,
      previewEdges,
    );
  }, [emphasisTokenKey, hoveredTokenKey, previewEdges]);

  const activeHandleKinds = useMemo(() => {
    const map = new Map<string, SemanticTokenKind>();
    const cache = refineCacheRef.current;
    cache.clear();
    for (const edge of previewEdges) {
      const { from, to } = cache.refine(edge, getNode);
      if (from.type === "handle") map.set(from.handle, edge.kind);
      if (to.type === "handle") map.set(to.handle, edge.kind);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision forces recompute after DOM reveal
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
    const cache = refineCacheRef.current;
    cache.clear();
    let lit = EMPTY_TRACE_LIT;
    for (const trace of pinnedTraces) {
      lit = mergeTraceLit(
        lit,
        computeTraceLit(
          trace.tokenKey,
          filterPreviewEdgesByVisibility(trace.edges, visibleEdgeKinds),
          getNode,
          cache,
        ),
      );
    }
    return lit;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision/registryRevision force recompute
  }, [getNode, pinnedTraces, revealRevision, registryRevision, visibleEdgeKinds]);

  const hoverLitKey = useMemo(() => {
    const candidate = emphasisTokenKey ?? hoveredTokenKey;
    if (!candidate) return null;
    if (pinnedKeys(pinnedTraces).includes(candidate)) return null;
    return candidate;
  }, [emphasisTokenKey, hoveredTokenKey, pinnedTraces]);

  const hoverTraceLit = useMemo(() => {
    if (!hoverLitKey) return EMPTY_TRACE_LIT;
    const cache = refineCacheRef.current;
    cache.clear();
    return computeTraceLit(
      hoverLitKey,
      filterPreviewEdgesByVisibility(hoverPreviewEdges, visibleEdgeKinds),
      getNode,
      cache,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision/registryRevision force recompute
  }, [
    getNode,
    hoverLitKey,
    hoverPreviewEdges,
    revealRevision,
    registryRevision,
    visibleEdgeKinds,
  ]);

  const traceLit = useMemo(
    () => mergeTraceLit(pinnedTraceLit, hoverTraceLit),
    [hoverTraceLit, pinnedTraceLit],
  );

  useLayoutEffect(() => {
    applyActiveTraceLit({
      traceTokenKey,
      hoveredTokenKey,
      emphasisTokenKey,
      traceLit,
      pinnedTokenKeySet,
      previewEdges,
      getNode,
      strengthRevision,
      lastApplyRef,
      clearLitTimerRef,
      fadingLitRef,
      onFadeComplete,
    });
  }, [
    getNode,
    hoveredTokenKey,
    emphasisTokenKey,
    pinnedTokenKeySet,
    previewEdges,
    traceLit,
    traceTokenKey,
    registryRevision,
    revealRevision,
    strengthRevision,
    onFadeComplete,
  ]);

  useLayoutEffect(
    () => () => {
      clearTraceLitTimer(clearLitTimerRef);
    },
    [],
  );

  return { isHandleActive, edgeKindAtHandle };
}
