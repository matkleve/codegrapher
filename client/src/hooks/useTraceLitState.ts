import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { computeTraceLit, EMPTY_TRACE_LIT, mergeTraceLit } from "@/lib/computeTraceLit";
import { filterPreviewEdgesByVisibility } from "@/lib/connectionVisibility";
import { pinnedKeys, type PinnedTrace } from "@/lib/pinnedTraces";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { applyTraceLit, clearTraceLit } from "@/lib/traceLitController";
import { traceLitFingerprint } from "@/lib/traceLitFingerprint";
import {
  setHoverPreviewEdgeIds,
  setTraceSessionActive,
  setWireHoveredTokenKey,
  subscribeTraceStrength,
} from "@/lib/wireHoverBoost";
import { notifyWireTransform } from "@/lib/wireEngine";

type UseTraceLitStateArgs = {
  previewEdges: PreviewEdgeSpec[];
  hoverPreviewEdges: PreviewEdgeSpec[];
  pinnedTraces: PinnedTrace[];
  pinnedTokenKeySet: ReadonlySet<string>;
  hoveredTokenKey: string | null;
  traceTokenKey: string | null;
  visibleEdgeKinds: ReadonlySet<ConnectionKind>;
  getNode: (id: string) => Node | undefined;
  revealRevision: string;
  registryRevision: number;
};

/**
 * Resolves which DOM handles/chips should render "lit" (active) and applies
 * that to the DOM directly (`applyTraceLit`) — the graph-wide visual state
 * that follows the current hover/pin trace. Separate from edge *building*
 * (`useConnectionEdgeState`) because lit state depends on DOM anchor
 * resolution, not just which edges exist.
 */
export function useTraceLitState({
  previewEdges,
  hoverPreviewEdges,
  pinnedTraces,
  pinnedTokenKeySet,
  hoveredTokenKey,
  traceTokenKey,
  visibleEdgeKinds,
  getNode,
  revealRevision,
  registryRevision,
}: UseTraceLitStateArgs) {
  const refineCacheRef = useRef(createRefinePreviewEdgeCache());
  const lastApplyRef = useRef({ fingerprint: "", hovered: "", strength: 0 });
  const [strengthRevision, setStrengthRevision] = useState(0);

  useLayoutEffect(() => subscribeTraceStrength(() => setStrengthRevision((n) => n + 1)), []);

  useLayoutEffect(() => {
    setHoverPreviewEdgeIds(
      hoveredTokenKey != null
        ? new Set(hoverPreviewEdges.map((edge) => edge.id))
        : new Set(),
    );
  }, [hoverPreviewEdges, hoveredTokenKey]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision forces recompute after DOM reveal, not read directly
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision/registryRevision force recompute after DOM reveal, not read directly
  }, [getNode, pinnedTraces, revealRevision, registryRevision, visibleEdgeKinds]);

  const hoverTraceLit = useMemo(() => {
    if (!hoveredTokenKey) return EMPTY_TRACE_LIT;
    if (pinnedKeys(pinnedTraces).includes(hoveredTokenKey)) {
      return EMPTY_TRACE_LIT;
    }
    const cache = refineCacheRef.current;
    cache.clear();
    return computeTraceLit(
      hoveredTokenKey,
      filterPreviewEdgesByVisibility(hoverPreviewEdges, visibleEdgeKinds),
      getNode,
      cache,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision/registryRevision force recompute after DOM reveal, not read directly
  }, [
    getNode,
    hoverPreviewEdges,
    hoveredTokenKey,
    pinnedTraces,
    revealRevision,
    registryRevision,
    visibleEdgeKinds,
  ]);

  const traceLit = useMemo(
    () => mergeTraceLit(pinnedTraceLit, hoverTraceLit),
    [hoverTraceLit, pinnedTraceLit],
  );

  useLayoutEffect(() => {
    if (!traceTokenKey) {
      lastApplyRef.current = { fingerprint: "", hovered: "", strength: 0 };
      setTraceSessionActive(false);
      setWireHoveredTokenKey(null);
      setHoverPreviewEdgeIds(new Set());
      clearTraceLit();
      return;
    }
    setTraceSessionActive(true);
    setWireHoveredTokenKey(hoveredTokenKey);
    const fingerprint = traceLitFingerprint(traceLit);
    const hovered = hoveredTokenKey ?? "";
    if (
      fingerprint === lastApplyRef.current.fingerprint &&
      hovered === lastApplyRef.current.hovered &&
      strengthRevision === lastApplyRef.current.strength
    ) {
      notifyWireTransform();
      return;
    }
    lastApplyRef.current = { fingerprint, hovered, strength: strengthRevision };
    applyTraceLit(traceLit, {
      pinnedTokenKeys: pinnedTokenKeySet,
      hoveredTokenKey,
      previewEdges,
      getNode,
    });
    notifyWireTransform();
  }, [
    getNode,
    hoveredTokenKey,
    pinnedTokenKeySet,
    previewEdges,
    traceLit,
    traceTokenKey,
    registryRevision,
    revealRevision,
    strengthRevision,
  ]);

  return { isHandleActive, edgeKindAtHandle };
}
