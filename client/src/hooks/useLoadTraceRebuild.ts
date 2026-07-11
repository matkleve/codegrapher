import { useCallback, useLayoutEffect, type RefObject } from "react";
import type { Node } from "@xyflow/react";
import type { PinnedTrace } from "@/lib/pinnedTraces";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { rebuildTraceEdgesForKey } from "@/lib/rebuildTraceEdges";
import type { GraphData, SymbolEntry } from "@/types";

type UseLoadTraceRebuildArgs = {
  graphData: GraphData | null;
  symbols: Map<string, SymbolEntry[]>;
  getNode: (id: string) => Node | undefined;
  hoveredTokenKeyRef: RefObject<string | null>;
  hoverPreviewEdges: PreviewEdgeSpec[];
  setHoverPreviewEdges: (
    updater: (prev: PreviewEdgeSpec[]) => PreviewEdgeSpec[],
  ) => void;
  pinnedTraces: PinnedTrace[];
  setPinnedTraces: (updater: (prev: PinnedTrace[]) => PinnedTrace[]) => void;
  pinnedTracesRef: RefObject<PinnedTrace[]>;
  revealRevision: string;
};

/**
 * A "Load stub" preview edge (target not yet on canvas) needs to be swapped
 * for a real in-graph wire once the user loads that file. Runs two rAFs after
 * any render where a load-flagged edge exists, so the swap happens after the
 * newly-loaded node's DOM has mounted.
 */
export function useLoadTraceRebuild({
  graphData,
  symbols,
  getNode,
  hoveredTokenKeyRef,
  hoverPreviewEdges,
  setHoverPreviewEdges,
  pinnedTraces,
  setPinnedTraces,
  pinnedTracesRef,
  revealRevision,
}: UseLoadTraceRebuildArgs) {
  const refreshLoadTraces = useCallback(() => {
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
  }, [getNode, graphData, hoveredTokenKeyRef, pinnedTracesRef, setHoverPreviewEdges, setPinnedTraces, symbols]);

  useLayoutEffect(() => {
    const pendingLoad =
      hoverPreviewEdges.some((e) => e.load) ||
      pinnedTraces.some((t) => t.edges.some((e) => e.load));
    if (!graphData || !pendingLoad) return;

    let outerRaf = 0;
    outerRaf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refreshLoadTraces();
      });
    });

    return () => cancelAnimationFrame(outerRaf);
  }, [
    refreshLoadTraces,
    getNode,
    graphData,
    hoverPreviewEdges,
    pinnedTraces,
    revealRevision,
    symbols,
  ]);

  return refreshLoadTraces;
}
