import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
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
import { notifyWireTransform } from "@/lib/wireEngine";

type UseTraceLitStateArgs = {
  previewEdges: PreviewEdgeSpec[];
  hoverPreviewEdges: PreviewEdgeSpec[];
  pinnedTraces: PinnedTrace[];
  anchorTrace: { tokenKey: string; edges: PreviewEdgeSpec[] } | null;
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
  anchorTrace,
  pinnedTokenKeySet,
  hoveredTokenKey,
  traceTokenKey,
  visibleEdgeKinds,
  getNode,
  revealRevision,
  registryRevision,
}: UseTraceLitStateArgs) {
  const refineCacheRef = useRef(createRefinePreviewEdgeCache());
  const lastApplyRef = useRef({ fingerprint: "", hovered: "" });

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

  const anchorTraceLit = useMemo(() => {
    if (!anchorTrace) return EMPTY_TRACE_LIT;
    const cache = refineCacheRef.current;
    cache.clear();
    return computeTraceLit(
      anchorTrace.tokenKey,
      filterPreviewEdgesByVisibility(anchorTrace.edges, visibleEdgeKinds),
      getNode,
      cache,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealRevision/registryRevision force recompute after DOM reveal, not read directly
  }, [anchorTrace, getNode, revealRevision, registryRevision, visibleEdgeKinds]);

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
    () => mergeTraceLit(mergeTraceLit(pinnedTraceLit, anchorTraceLit), hoverTraceLit),
    [anchorTraceLit, hoverTraceLit, pinnedTraceLit],
  );

  useLayoutEffect(() => {
    if (!traceTokenKey) {
      lastApplyRef.current = { fingerprint: "", hovered: "" };
      clearTraceLit();
      return;
    }
    const fingerprint = traceLitFingerprint(traceLit);
    const hovered = hoveredTokenKey ?? "";
    if (
      fingerprint === lastApplyRef.current.fingerprint &&
      hovered === lastApplyRef.current.hovered
    ) {
      notifyWireTransform();
      return;
    }
    lastApplyRef.current = { fingerprint, hovered };
    applyTraceLit(traceLit, {
      pinnedTokenKeys: pinnedTokenKeySet,
      hoveredTokenKey,
    });
    notifyWireTransform();
  }, [
    hoveredTokenKey,
    pinnedTokenKeySet,
    traceLit,
    traceTokenKey,
    registryRevision,
    revealRevision,
  ]);

  return { isHandleActive, edgeKindAtHandle };
}
