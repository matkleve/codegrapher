import { useCallback, useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import {
  buildStructuralEdges,
  mountedClassGraphIds,
} from "@/lib/buildStructuralEdges";
import { buildTransitiveEdges } from "@/lib/buildTransitiveEdges";
import {
  DEFAULT_VISIBLE_EDGE_KINDS,
  filterPreviewEdgesByVisibility,
  structuralTypesForVisibleKinds,
} from "@/lib/connectionVisibility";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import { pinnedKeys, type PinnedTrace } from "@/lib/pinnedTraces";
import { mergePreviewEdgesByStrength } from "@/lib/wireHoverBoost";
import { filterRenderablePreviewEdges } from "@/lib/previewEdgeFilter";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { GraphData, SymbolEntry } from "@/types";

/** Hop distance beyond which no transitive wire is drawn (see connection-taxonomy.md). */
const TRANSITIVE_HOP_DEPTH = 2;

type UseConnectionEdgeStateArgs = {
  graphData: GraphData | null;
  nodes: Node[];
  getNode: (id: string) => Node | undefined;
  symbols: Map<string, SymbolEntry[]>;
  usageSiteIndex: Map<string, UsageSiteRecord[]>;
  anchorPreviewEdges?: PreviewEdgeSpec[];
  anchorTokenKey?: string | null;
  hoverPreviewEdges: PreviewEdgeSpec[];
  pinnedPreviewEdges: PreviewEdgeSpec[];
  pinnedTraces: PinnedTrace[];
  hoveredTokenKey: string | null;
  traceTokenKey: string | null;
};

/**
 * Builds the three edge layers the overlay renders: on-demand preview edges
 * (hover/pin + transitive fan-out, filtered by legend visibility), and
 * persistent structural edges (extends/implements/composition/imports) for
 * whichever classes are currently mounted on canvas.
 */
export function useConnectionEdgeState({
  graphData,
  nodes,
  getNode,
  symbols,
  usageSiteIndex,
  hoverPreviewEdges,
  anchorPreviewEdges = [],
  anchorTokenKey = null,
  pinnedPreviewEdges,
  pinnedTraces,
  hoveredTokenKey,
  traceTokenKey,
}: UseConnectionEdgeStateArgs) {
  const [visibleEdgeKinds, setVisibleEdgeKinds] = useState<Set<ConnectionKind>>(
    () => new Set(DEFAULT_VISIBLE_EDGE_KINDS),
  );
  const [pulseEdges, setPulseEdges] = useState<StructuralEdgeSpec[]>([]);

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

  const hasParallelHover =
    pinnedTraces.length > 0 &&
    hoveredTokenKey != null &&
    !pinnedKeys(pinnedTraces).includes(hoveredTokenKey) &&
    hoverPreviewEdges.length > 0;

  const hasEphemeralAnchor =
    pinnedTraces.length === 0 &&
    anchorPreviewEdges.length > 0 &&
    anchorTokenKey != null &&
    hoveredTokenKey != null &&
    anchorTokenKey !== hoveredTokenKey &&
    hoverPreviewEdges.length > 0;

  /** Hop 2+ fan-out for whichever token is currently emphasized (pointer > committed > pin). */
  const transitiveEdges = useMemo(() => {
    if (!traceTokenKey || !graphData) return [];
    return buildTransitiveEdges(
      traceTokenKey,
      graphData,
      usageSiteIndex,
      TRANSITIVE_HOP_DEPTH,
      getNode,
      symbols,
    ).map((e) => ({ ...e, connectionKind: "transitive" as const }));
  }, [traceTokenKey, graphData, usageSiteIndex, getNode, symbols]);

  const previewEdges = useMemo(() => {
    let edges: PreviewEdgeSpec[];
    if (pinnedPreviewEdges.length > 0) {
      edges = hasParallelHover
        ? mergePreviewEdgesByStrength(pinnedPreviewEdges, hoverPreviewEdges)
        : pinnedPreviewEdges;
    } else if (hasEphemeralAnchor) {
      edges = mergePreviewEdgesByStrength(anchorPreviewEdges, hoverPreviewEdges);
    } else {
      edges = hoverPreviewEdges;
    }

    if (edges.length > 0 && transitiveEdges.length > 0) {
      edges = [...edges, ...transitiveEdges];
    }

    return filterPreviewEdgesByVisibility(
      filterRenderablePreviewEdges(edges, getNode),
      visibleEdgeKinds,
    );
  }, [
    getNode,
    hoverPreviewEdges,
    anchorPreviewEdges,
    hasParallelHover,
    hasEphemeralAnchor,
    pinnedPreviewEdges,
    transitiveEdges,
    visibleEdgeKinds,
  ]);

  /**
   * Edges that count as "under the pointer" for wire/chip hover-preview brightness —
   * the hover trace's own hop-1 edges plus its hop-2+ fan-out only. Deliberately
   * excludes `pinnedPreviewEdges`: those get merged into `previewEdges` for parallel
   * display, but a pinned/focused trace's own wires must stay at focus strength while
   * hovering an unrelated token, not jump to hover strength (see token-hover atlas —
   * "Agent pitfall — wire hover vs focus+hover").
   */
  const hoverEmphasisEdges = useMemo(() => {
    if (hoverPreviewEdges.length === 0 && transitiveEdges.length === 0) return hoverPreviewEdges;
    return [...hoverPreviewEdges, ...transitiveEdges];
  }, [hoverPreviewEdges, transitiveEdges]);

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

  return useMemo(
    () => ({
      previewEdges,
      hoverEmphasisEdges,
      structuralEdges,
      pulseEdges,
      setPulseEdges,
      visibleEdgeKinds,
      isEdgeKindVisible,
      toggleEdgeKind,
      transitiveHopDepth: TRANSITIVE_HOP_DEPTH,
    }),
    [
      previewEdges,
      hoverEmphasisEdges,
      structuralEdges,
      pulseEdges,
      setPulseEdges,
      visibleEdgeKinds,
      isEdgeKindVisible,
      toggleEdgeKind,
    ],
  );
}
