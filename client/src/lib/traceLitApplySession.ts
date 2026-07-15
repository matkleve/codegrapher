import type { Node } from "@xyflow/react";
import type { TraceLitState } from "@/lib/traceLitState";
import { traceLitFingerprint } from "@/lib/traceLitFingerprint";
import { MOTION_TRACE_OUT_MS } from "@/lib/motionTokens";
import { setTraceLitFading } from "@/lib/traceLitFading";
import { applyTraceLit, clearTraceLit, unwindTraceLit } from "@/lib/traceLitController";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { getTraceSessionMood } from "@/lib/traceSessionMood";
import {
  setHoverPreviewEdgeIds,
  setWireHoveredTokenKey,
} from "@/lib/wireHoverBoost";
import { notifyWireTransform } from "@/lib/wireEngine";
import { markLitApplyPhase } from "@/lib/traceTimeline";

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
  onFadeComplete?: () => void;
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
    onFadeComplete,
  } = args;

  const mood = getTraceSessionMood();
  const shouldFade =
    !traceTokenKey && (mood === "leaving" || fadingLitRef.current);

  if (shouldFade && !traceTokenKey) {
    if (!fadingLitRef.current) {
      fadingLitRef.current = true;
      setTraceLitFading(true);
      setWireHoveredTokenKey(null);
      setHoverPreviewEdgeIds(new Set());
      unwindTraceLit();
      // Drop lit classes immediately so CSS transitions run during the fade window
      // (waiting before clearTraceLit left a dead 120ms with no visible motion).
      clearTraceLit();
      lastApplyRef.current = { fingerprint: "", hovered: "", strength: 0 };
      clearLitTimerRef.current = window.setTimeout(() => {
        fadingLitRef.current = false;
        setTraceLitFading(false);
        clearLitTimerRef.current = 0;
        onFadeComplete?.();
      }, MOTION_TRACE_OUT_MS);
    }
    return;
  }

  if (!traceTokenKey) {
    return;
  }

  if (mood === "pending") {
    return;
  }

  fadingLitRef.current = false;
  setTraceLitFading(false);
  window.clearTimeout(clearLitTimerRef.current);
  clearLitTimerRef.current = 0;
  const pointerKey = emphasisTokenKey ?? hoveredTokenKey;
  const fingerprint = traceLitFingerprint(traceLit);
  const hovered = pointerKey ?? "";
  if (
    fingerprint === lastApplyRef.current.fingerprint &&
    hovered === lastApplyRef.current.hovered &&
    strengthRevision === lastApplyRef.current.strength
  ) {
    return;
  }
  lastApplyRef.current = { fingerprint, hovered, strength: strengthRevision };
  const syncStart = performance.now();
  applyTraceLit(traceLit, {
    pinnedTokenKeys: pinnedTokenKeySet,
    hoveredTokenKey,
    emphasisTokenKey,
    previewEdges,
    getNode,
  });
  markLitApplyPhase(traceLit.litTokenKeys.size, performance.now() - syncStart);
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
