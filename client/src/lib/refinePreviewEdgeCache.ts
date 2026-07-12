import type { AnchorRef, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import type { Node } from "@xyflow/react";

export type RefinedPreviewEdge = {
  from: AnchorRef;
  to: AnchorRef;
};

/** Per-trace-session cache — edges are new objects each render but ids are stable. */
export function createRefinePreviewEdgeCache(): {
  refine: (
    spec: PreviewEdgeSpec,
    getNode: (id: string) => Node | undefined,
  ) => RefinedPreviewEdge;
  clear: () => void;
} {
  const byId = new Map<string, RefinedPreviewEdge>();

  return {
    refine(spec, getNode) {
      const hit = byId.get(spec.id);
      if (hit) return hit;
      const refined = refinePreviewEdge(spec, getNode);
      byId.set(spec.id, refined);
      return refined;
    },
    clear() {
      byId.clear();
    },
  };
}
