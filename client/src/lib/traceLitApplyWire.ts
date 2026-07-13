import type { TraceLitState } from "@/lib/computeTraceLit";
import {
  boostChipForTraceKey,
} from "@/lib/traceLitApplyHost";
import {
  getWireHoveredEdgeId,
  isHoverPreviewEdge,
  traceKeysFromWire,
} from "@/lib/wireHoverBoost";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";
import type { HostState } from "@/lib/traceLitApplyDom";

/** Brighten endpoints on parallel hover-preview edges only — not every wire touching the cursor. */
export function applyHoveredWireEndpointBoost(
  next: Map<HTMLElement, HostState>,
  state: TraceLitState,
  previewEdges: PreviewEdgeSpec[],
  getNode: (id: string) => Node | undefined,
  hoveredTokenKey: string | null,
  pinnedTokenKeys: ReadonlySet<string>,
): void {
  if (!hoveredTokenKey) return;
  for (const spec of previewEdges) {
    if (!isHoverPreviewEdge(spec.id)) continue;
    for (const key of traceKeysFromWire(spec, getNode)) {
      // Hover-preview brightness belongs to the token under the cursor only;
      // the connected endpoint stays lit at focus strength, not hover.
      boostChipForTraceKey(next, state, key, pinnedTokenKeys, key === hoveredTokenKey);
    }
  }
}

export function applyWireHoverBoost(
  next: Map<HTMLElement, HostState>,
  state: TraceLitState,
  previewEdges: PreviewEdgeSpec[],
  getNode: (id: string) => Node | undefined,
  pinnedTokenKeys: ReadonlySet<string>,
): void {
  const wireId = getWireHoveredEdgeId();
  if (!wireId) return;
  const spec = previewEdges.find((edge) => edge.id === wireId);
  if (!spec) return;

  for (const key of traceKeysFromWire(spec, getNode)) {
    boostChipForTraceKey(next, state, key, pinnedTokenKeys);
  }
}
