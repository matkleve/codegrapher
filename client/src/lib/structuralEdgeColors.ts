import type { StructuralEdgeType } from "@/types";

/** Persistent structural edge strokes — theme-aware via CSS variables. */
export const STRUCTURAL_EDGE_STROKE: Record<StructuralEdgeType, string> = {
  extends: "var(--edge-inheritance)",
  implements: "var(--edge-implementation)",
  composition: "var(--edge-composition)",
  imports: "var(--edge-import)",
};

export type ConnectionKind =
  | "usage"
  | "binding"
  | "branch"
  | "transitive"
  | "inheritance"
  | "implementation"
  | "composition"
  | "override"
  | "shared-dependency"
  | "module-import";

export const CONNECTION_KIND_LABEL: Record<ConnectionKind, string> = {
  usage: "Usage",
  binding: "Binding",
  branch: "Control flow",
  transitive: "Transitive",
  inheritance: "Inheritance",
  implementation: "Implementation",
  composition: "Composition",
  override: "Override",
  "shared-dependency": "Shared dependency",
  "module-import": "Module import",
};

export function graphEdgeToConnectionKind(
  type: StructuralEdgeType,
): Exclude<ConnectionKind, "usage" | "transitive" | "override" | "shared-dependency"> {
  switch (type) {
    case "extends":
      return "inheritance";
    case "implements":
      return "implementation";
    case "composition":
      return "composition";
    case "imports":
      return "module-import";
  }
}
