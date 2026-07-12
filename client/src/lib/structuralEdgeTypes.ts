import type { StructuralEdgeType } from "@/types";
import type { AnchorRef } from "@/lib/previewEdgeTypes";
import {
  STRUCTURAL_EDGE_STYLE,
  structuralMarkerId,
  type StructuralArrowhead,
  type StructuralStrokeStyle,
} from "@/lib/connectionWireStyle";

export type { StructuralStrokeStyle, StructuralArrowhead };
export { STRUCTURAL_EDGE_STYLE, structuralMarkerId };

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
