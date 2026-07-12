import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { AnchorRef, LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  findMemberDefLabel,
  refinePreviewEdge,
  resolveDefinitionSiteAnchor,
  resolveUsageSiteAnchor,
} from "@/lib/resolveLiveAnchor";
import { makeMemberDefKey, makeUsageTokenKey } from "@/lib/traceKeys";
import type { Node } from "@xyflow/react";

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

function flowAnchorElement(handle: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-flow-anchor-target="${CSS.escape(handle)}"]`,
  );
}

/** Wire hit-zone at `end` jumps to the opposite endpoint (prototype-aligned). */
export function jumpTargetForWireEnd(
  spec: PreviewEdgeSpec,
  end: "from" | "to",
  getNode: (id: string) => Node | undefined,
): { ref: AnchorRef; hint?: LiveAnchorHint } {
  const refined = refinePreviewEdge(spec, getNode);
  const jumpSide = end === "from" ? "to" : "from";
  return {
    ref: jumpSide === "to" ? refined.to : refined.from,
    hint: jumpSide === "to" ? spec.liveTo : spec.liveFrom,
  };
}

function endpointTraceKey(
  spec: PreviewEdgeSpec,
  side: "from" | "to",
  getNode: (id: string) => Node | undefined,
): string | null {
  const hint = side === "from" ? spec.liveFrom : spec.liveTo;
  if (hint?.traceKey) return hint.traceKey;
  const refined = refinePreviewEdge(spec, getNode);
  const ref = side === "from" ? refined.from : refined.to;
  const el = resolveJumpTargetElement(ref, hint, getNode);
  if (!el) return null;
  return traceKeyForJumpTarget(el, hint);
}

function lexicalPosition(hint: LiveAnchorHint | undefined): number | null {
  if (hint?.lineNumber == null) return null;
  return hint.lineNumber * 10_000 + (hint.tokenIndex ?? 0);
}

/**
 * Pick which wire hit-zone end to activate so the jump lands **away** from the
 * focused trace host — never back onto the hovered/pinned token. When focus is
 * ambiguous, prefer downstream (child usage) over upstream (parent def).
 */
export function pickJumpWireEnd(
  spec: PreviewEdgeSpec,
  activeTraceKey: string | null,
  getNode: (id: string) => Node | undefined,
): "from" | "to" {
  const fromKey = endpointTraceKey(spec, "from", getNode);
  const toKey = endpointTraceKey(spec, "to", getNode);

  if (activeTraceKey) {
    const atFrom = fromKey != null && fromKey === activeTraceKey;
    const atTo = toKey != null && toKey === activeTraceKey;
    if (atFrom && !atTo) return "from";
    if (atTo && !atFrom) return "to";
  }

  const fromPos = lexicalPosition(spec.liveFrom);
  const toPos = lexicalPosition(spec.liveTo);
  if (fromPos != null && toPos != null && fromPos !== toPos) {
    return toPos > fromPos ? "from" : "to";
  }

  if (spec.liveTo?.role === "usage" && spec.liveFrom?.role === "definition") {
    return "from";
  }
  if (spec.liveFrom?.role === "usage" && spec.liveTo?.role === "definition") {
    return "to";
  }

  return spec.liveTo?.role === "usage" ? "from" : "to";
}

export function resolveJumpTargetElement(
  ref: AnchorRef,
  hint: LiveAnchorHint | undefined,
  getNode: (id: string) => Node | undefined,
): HTMLElement | null {
  if (ref.type === "element" && ref.el.isConnected) return ref.el;

  if (hint?.role === "definition") {
    const resolved = resolveDefinitionSiteAnchor(
      hint.token,
      hint.flowNodeId,
      hint.memberId,
      getNode,
    );
    if (resolved.type === "element" && resolved.el.isConnected) return resolved.el;
    if (resolved.type === "handle") {
      const anchor = flowAnchorElement(resolved.handle);
      if (anchor?.isConnected) return anchor;
      if (hint.memberId) {
        return findMemberDefLabel(hint.flowNodeId, hint.memberId, hint.token);
      }
    }
  }

  if (hint?.role === "usage" && hint.memberId && hint.lineNumber != null && hint.tokenIndex != null) {
    const classData = getClassNodeData(hint.flowNodeId, getNode);
    if (classData) {
      const resolved = resolveUsageSiteAnchor(
        hint.flowNodeId,
        classData,
        hint.memberId,
        hint.lineNumber,
        hint.tokenIndex,
        hint.token,
      );
      if (resolved.type === "element" && resolved.el.isConnected) return resolved.el;
      if (resolved.type === "handle") {
        const anchor = flowAnchorElement(resolved.handle);
        if (anchor?.isConnected) return anchor;
      }
    }
  }

  if (ref.type === "handle") {
    return flowAnchorElement(ref.handle);
  }

  return null;
}

export function traceKeyForJumpTarget(
  el: HTMLElement,
  hint: LiveAnchorHint | undefined,
): string | null {
  if (el.dataset.traceKey) return el.dataset.traceKey;
  const host = el.closest<HTMLElement>("[data-trace-key]");
  if (host?.dataset.traceKey) return host.dataset.traceKey;
  if (!hint) return null;
  if (hint.role === "definition" && hint.memberId) {
    return makeMemberDefKey(hint.flowNodeId, hint.memberId);
  }
  if (hint.role === "usage" && hint.memberId && hint.lineNumber != null && hint.tokenIndex != null) {
    return makeUsageTokenKey(
      hint.flowNodeId,
      hint.memberId,
      hint.lineNumber,
      hint.tokenIndex,
      hint.token,
    );
  }
  return null;
}

export function jumpTargetLabel(
  ref: AnchorRef,
  hint: LiveAnchorHint | undefined,
  getNode: (id: string) => Node | undefined,
): string {
  const el = resolveJumpTargetElement(ref, hint, getNode);
  if (el?.dataset.symbolName) return el.dataset.symbolName;
  return hint?.token ?? "";
}
