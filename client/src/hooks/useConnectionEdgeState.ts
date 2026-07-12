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

  const previewEdges = useMemo(() => {
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

    if (traceTokenKey && graphData && edges.length > 0) {
      const transitive = buildTransitiveEdges(
        traceTokenKey,
        graphData,
        usageSiteIndex,
        TRANSITIVE_HOP_DEPTH,
        getNode,
        symbols,
      );
      if (transitive.length > 0) {
        edges = [
          ...edges,
          ...transitive.map((e) => ({ ...e, connectionKind: "transitive" as const })),
        ];
      }
    }

    return filterPreviewEdgesByVisibility(
      filterRenderablePreviewEdges(edges, getNode),
      visibleEdgeKinds,
    );
  }, [
    graphData,
    getNode,
    hoverPreviewEdges,
    anchorPreviewEdges,
    anchorTokenKey,
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

  return useMemo(
    () => ({
      previewEdges,
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
      structuralEdges,
      pulseEdges,
      setPulseEdges,
      visibleEdgeKinds,
      isEdgeKindVisible,
      toggleEdgeKind,
    ],
  );
}
