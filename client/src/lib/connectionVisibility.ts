import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import type { StructuralEdgeType } from "@/types";

/** Legend kinds that render on by default (module import stays off). */
export const DEFAULT_VISIBLE_EDGE_KINDS: ReadonlySet<ConnectionKind> = new Set([
  "usage",
  "binding",
  "branch",
  "inheritance",
  "implementation",
  "composition",
]);

export function previewConnectionKind(
  edge: PreviewEdgeSpec,
): "usage" | "binding" | "branch" | "transitive" {
  return edge.connectionKind ?? (edge.hop != null && edge.hop >= 2 ? "transitive" : "usage");
}

export function filterPreviewEdgesByVisibility(
  edges: PreviewEdgeSpec[],
  kinds: ReadonlySet<ConnectionKind>,
): PreviewEdgeSpec[] {
  return edges.filter((edge) => {
    const kind = previewConnectionKind(edge);
    if (kind === "transitive") return kinds.has("usage");
    return kinds.has(kind);
  });
}

export function structuralTypesForVisibleKinds(
  kinds: ReadonlySet<ConnectionKind>,
): Set<StructuralEdgeType> {
  const types = new Set<StructuralEdgeType>();
  if (kinds.has("inheritance")) types.add("extends");
  if (kinds.has("implementation")) types.add("implements");
  if (kinds.has("composition")) types.add("composition");
  if (kinds.has("module-import")) types.add("imports");
  return types;
}
