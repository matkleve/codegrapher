import type { TraceLitState } from "@/lib/computeTraceLit";
import {
  boostChipForTraceKey,
} from "@/lib/traceLitApplyHost";
import {
  edgeTouchesHoveredToken,
  getWireHoveredEdgeId,
  isHoverPreviewEdge,
  traceKeysFromWire,
} from "@/lib/wireHoverBoost";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";
import type { HostState } from "@/lib/traceLitApplyDom";

/** Brighten both ends of wires attached to the hovered chip. */
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
    const touchesHover = edgeTouchesHoveredToken(spec, getNode, hoveredTokenKey);
    if (!touchesHover && !isHoverPreviewEdge(spec.id)) continue;
    for (const key of traceKeysFromWire(spec, getNode)) {
      boostChipForTraceKey(next, state, key, pinnedTokenKeys);
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
