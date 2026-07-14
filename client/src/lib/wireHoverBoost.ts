import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";
import {
  getWireHoveredEdgeId,
  getWireHoveredTokenKey,
  isHoverPreviewEdge,
} from "@/lib/trace/traceEngine";

// Pointer / emphasis *state* now lives in traceEngine; re-exported here so the
// existing call sites keep working. This module keeps the pure emphasis
// predicates that read that state.
export {
  subscribeTraceStrength,
  setWireHoveredTokenKey,
  getWireHoveredTokenKey,
  setHoverPreviewEdgeIds,
  isHoverPreviewEdge,
  setTraceSessionActive,
  isTraceSessionActive,
  setWireHoveredEdgeId,
  getWireHoveredEdgeId,
} from "@/lib/trace/traceEngine";

function hopRank(hop: number | undefined): number {
  if (hop == null || hop <= 1) return 1;
  return hop;
}

/** When pin + parallel hover emit the same wire id, keep the stronger (closer) hop. */
export function mergePreviewEdgesByStrength(
  base: PreviewEdgeSpec[],
  overlay: PreviewEdgeSpec[],
): PreviewEdgeSpec[] {
  const byId = new Map<string, PreviewEdgeSpec>();
  for (const edge of base) byId.set(edge.id, edge);
  for (const edge of overlay) {
    const prev = byId.get(edge.id);
    if (!prev || hopRank(edge.hop) < hopRank(prev.hop)) {
      byId.set(edge.id, edge);
    }
  }
  return [...byId.values()];
}

function traceKeyFromElement(el: HTMLElement): string | null {
  return (
    el.dataset.traceKey ?? el.dataset.localDefId ?? el.dataset.localTargetId ?? null
  );
}

/** True when either endpoint is the chip currently under the cursor. */
export function edgeTouchesHoveredToken(
  spec: PreviewEdgeSpec,
  getNode: (id: string) => Node | undefined,
  hoverKey: string | null = getWireHoveredTokenKey(),
): boolean {
  if (!hoverKey) return false;
  const { from, to } = refinePreviewEdge(spec, getNode);
  for (const ref of [from, to]) {
    if (ref.type !== "element" || !ref.el.isConnected) continue;
    const key = traceKeyFromElement(ref.el);
    if (key === hoverKey) return true;
  }
  return false;
}

export function traceKeysFromWire(
  spec: PreviewEdgeSpec,
  getNode: (id: string) => Node | undefined,
): string[] {
  const { from, to } = refinePreviewEdge(spec, getNode);
  const keys: string[] = [];
  for (const ref of [from, to]) {
    if (ref.type !== "element" || !ref.el.isConnected) continue;
    const key = traceKeyFromElement(ref.el);
    if (key) keys.push(key);
  }
  return keys;
}

export function isWireHovered(
  spec: PreviewEdgeSpec,
  wirePath?: SVGPathElement | null,
): boolean {
  const hoveredWireEdgeId = getWireHoveredEdgeId();
  if (hoveredWireEdgeId != null && spec.id === hoveredWireEdgeId) return true;
  return wirePath?.classList.contains("preview-edge-line-hover") ?? false;
}

/** Pointer emphasis on this wire — direct touch, wire hit-zone, or hover-preview overlay. */
export function isWireEmphasized(
  spec: PreviewEdgeSpec,
  getNode?: (id: string) => Node | undefined,
  wirePath?: SVGPathElement | null,
): boolean {
  if (isWireHovered(spec, wirePath)) return true;
  const hoveredTokenKey = getWireHoveredTokenKey();
  if (!hoveredTokenKey) return false;
  if (isHoverPreviewEdge(spec.id)) return true;
  return getNode != null && edgeTouchesHoveredToken(spec, getNode, hoveredTokenKey);
}

/** Pointer is emphasizing a specific token or wire within an active trace. */
export function isTraceEmphasisActive(): boolean {
  return getWireHoveredTokenKey() != null || getWireHoveredEdgeId() != null;
}
