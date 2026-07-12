import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";

/** Live hovered token — read during wire rAF ticks (no React render required). */
let hoveredTokenKey: string | null = null;

/** Wire under cursor (jump tooltip armed) — boosts endpoint chips. */
let hoveredWireEdgeId: string | null = null;

/** Committed trace (pin / dwell) — strength must not drop when the pointer leaves a card. */
let traceSessionActive = false;

const strengthListeners = new Set<() => void>();

function notifyStrengthListeners(): void {
  for (const listener of strengthListeners) listener();
}

export function subscribeTraceStrength(listener: () => void): () => void {
  strengthListeners.add(listener);
  return () => strengthListeners.delete(listener);
}

export function setWireHoveredTokenKey(key: string | null): void {
  hoveredTokenKey = key;
}

export function getWireHoveredTokenKey(): string | null {
  return hoveredTokenKey;
}

export function setTraceSessionActive(active: boolean): void {
  if (traceSessionActive === active) return;
  traceSessionActive = active;
  notifyStrengthListeners();
}

export function isTraceSessionActive(): boolean {
  return traceSessionActive;
}

export function setWireHoveredEdgeId(id: string | null): void {
  if (hoveredWireEdgeId === id) return;
  hoveredWireEdgeId = id;
  notifyStrengthListeners();
}

export function getWireHoveredEdgeId(): string | null {
  return hoveredWireEdgeId;
}

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
  hoverKey: string | null = hoveredTokenKey,
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
  if (hoveredWireEdgeId != null && spec.id === hoveredWireEdgeId) return true;
  return wirePath?.classList.contains("preview-edge-line-hover") ?? false;
}

/** Pointer is emphasizing a specific token or wire within an active trace. */
export function isTraceEmphasisActive(): boolean {
  return hoveredTokenKey != null || hoveredWireEdgeId != null;
}
