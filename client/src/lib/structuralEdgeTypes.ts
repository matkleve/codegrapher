import type { StructuralEdgeType } from "@/types";
import type { AnchorRef } from "@/lib/previewEdgeTypes";

export type StructuralStrokeStyle = "solid" | "dotted";
export type StructuralArrowhead = "triangle-hollow" | "diamond-filled" | "open";

export type StructuralEdgeSpec = {
  id: string;
  from: AnchorRef;
  to: AnchorRef;
  edgeType: StructuralEdgeType;
  strokeStyle: StructuralStrokeStyle;
  arrowhead: StructuralArrowhead;
  label?: string;
  /** Transient pulse during simulation (value-flow). */
  pulse?: boolean;
  /** Hop decay for transitive overlay reuse (optional). */
  opacity?: number;
};

export const STRUCTURAL_EDGE_STYLE: Record<
  StructuralEdgeType,
  { strokeStyle: StructuralStrokeStyle; arrowhead: StructuralArrowhead }
> = {
  extends: { strokeStyle: "solid", arrowhead: "triangle-hollow" },
  implements: { strokeStyle: "dotted", arrowhead: "triangle-hollow" },
  composition: { strokeStyle: "solid", arrowhead: "diamond-filled" },
  imports: { strokeStyle: "dotted", arrowhead: "open" },
};

export function structuralMarkerId(arrowhead: StructuralArrowhead): string {
  switch (arrowhead) {
    case "triangle-hollow":
      return "structural-arrow-triangle";
    case "diamond-filled":
      return "structural-arrow-diamond";
    case "open":
      return "structural-arrow-open";
  }
}
