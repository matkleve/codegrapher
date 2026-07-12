import type { Node } from "@xyflow/react";
import type { TraceLitState } from "@/lib/traceLitState";
import { traceLitFingerprint } from "@/lib/traceLitFingerprint";
import { MOTION_TRACE_MS } from "@/lib/motionTokens";
import { setTraceLitFading } from "@/lib/traceLitFading";
import { applyTraceLit, clearTraceLit, unwindTraceLit } from "@/lib/traceLitController";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  setHoverPreviewEdgeIds,
  setTraceSessionActive,
  setWireHoveredTokenKey,
} from "@/lib/wireHoverBoost";
import { notifyWireTransform } from "@/lib/wireEngine";

type LastApply = { fingerprint: string; hovered: string; strength: number };

export type TraceLitApplyArgs = {
  traceTokenKey: string | null;
  hoveredTokenKey: string | null;
  emphasisTokenKey: string | null;
  traceLit: TraceLitState;
  pinnedTokenKeySet: ReadonlySet<string>;
  previewEdges: PreviewEdgeSpec[];
  getNode: (id: string) => Node | undefined;
  strengthRevision: number;
  lastApplyRef: { current: LastApply };
  clearLitTimerRef: { current: number };
  fadingLitRef: { current: boolean };
};

export function applyActiveTraceLit(args: TraceLitApplyArgs): void {
  const {
    traceTokenKey,
    hoveredTokenKey,
    emphasisTokenKey,
    traceLit,
    pinnedTokenKeySet,
    previewEdges,
    getNode,
    strengthRevision,
    lastApplyRef,
    clearLitTimerRef,
    fadingLitRef,
  } = args;

  if (!traceTokenKey) {
    if (!fadingLitRef.current) {
      fadingLitRef.current = true;
      setTraceLitFading(true);
      setWireHoveredTokenKey(null);
      setHoverPreviewEdgeIds(new Set());
      unwindTraceLit();
      clearLitTimerRef.current = window.setTimeout(() => {
        lastApplyRef.current = { fingerprint: "", hovered: "", strength: 0 };
        clearTraceLit();
        setTraceSessionActive(false);
        fadingLitRef.current = false;
        setTraceLitFading(false);
        clearLitTimerRef.current = 0;
      }, MOTION_TRACE_MS);
    }
    return;
  }

  fadingLitRef.current = false;
  setTraceLitFading(false);
  window.clearTimeout(clearLitTimerRef.current);
  clearLitTimerRef.current = 0;
  setTraceSessionActive(true);
  const pointerKey = emphasisTokenKey ?? hoveredTokenKey;
  setWireHoveredTokenKey(pointerKey);
  const fingerprint = traceLitFingerprint(traceLit);
  const hovered = pointerKey ?? "";
  if (
    fingerprint === lastApplyRef.current.fingerprint &&
    hovered === lastApplyRef.current.hovered &&
    strengthRevision === lastApplyRef.current.strength
  ) {
    notifyWireTransform();
    return;
  }
  lastApplyRef.current = { fingerprint, hovered, strength: strengthRevision };
  applyTraceLit(traceLit, {
    pinnedTokenKeys: pinnedTokenKeySet,
    hoveredTokenKey,
    emphasisTokenKey,
    previewEdges,
    getNode,
  });
  notifyWireTransform();
}

export function syncHoverPreviewEdgeIds(
  pointerKey: string | null,
  edges: PreviewEdgeSpec[],
): void {
  setHoverPreviewEdgeIds(
    pointerKey != null ? new Set(edges.map((edge) => edge.id)) : new Set(),
  );
}

export function clearTraceLitTimer(clearLitTimerRef: { current: number }): void {
  window.clearTimeout(clearLitTimerRef.current);
}
