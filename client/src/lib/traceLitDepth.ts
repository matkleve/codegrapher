import {
  getByLocalDefId,
  getByLocalTargetId,
  getByMemberId,
  getByTraceKey,
} from "@/lib/elementRegistry";
import { depthFromHop } from "@/lib/traceDepth";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import {
  parseControlFlowKey,
  parseUsageTokenKey,
} from "@/lib/traceKeys";
import type { LitCollections } from "@/lib/traceLitState";

export type ResolvedEndpoint = {
  traceKey: string;
  memberId: string | null;
  flowNodeId: string | null;
  kind: SemanticTokenKind | null;
};

export function noteDepth(
  state: LitCollections,
  key: string,
  depth: number,
): void {
  const prev = state.traceDepth.get(key);
  if (prev === undefined || depth < prev) {
    state.traceDepth.set(key, depth);
  }
}

export function lineAnchorFromKey(
  key: string,
): { memberId: string; lineNumber: number } | null {
  const usage = parseUsageTokenKey(key);
  if (usage) {
    return { memberId: usage.memberId, lineNumber: usage.lineNumber };
  }
  const cf = parseControlFlowKey(key);
  if (cf) {
    return { memberId: cf.memberId, lineNumber: cf.lineNumber };
  }
  return null;
}

export function litLineKey(memberId: string, lineNumber: number): string {
  return `${memberId}::${lineNumber}`;
}

export function noteLineDepth(
  state: LitCollections,
  memberId: string,
  lineNumber: number,
  depth: number,
): void {
  const key = litLineKey(memberId, lineNumber);
  const prev = state.litLineDepth.get(key);
  if (prev === undefined || depth < prev) {
    state.litLineDepth.set(key, depth);
  }
}

export function noteLineFromKey(
  state: LitCollections,
  traceKey: string,
  depth: number,
): void {
  const line = lineAnchorFromKey(traceKey);
  if (line) noteLineDepth(state, line.memberId, line.lineNumber, depth);
}

export function noteSiblingEndpoint(
  state: LitCollections,
  key: string,
  activeTokenKey: string,
): void {
  if (key === activeTokenKey) return;
  state.siblingEndpointTokenKeys.add(key);
  noteDepth(state, key, 2);
}

export function edgeDepth(edge: PreviewEdgeSpec): number {
  return depthFromHop(edge.hop);
}

export function noteEndpointDepth(
  state: LitCollections,
  key: string,
  activeTokenKey: string,
  depth: number,
): void {
  if (key === activeTokenKey) {
    noteDepth(state, key, 1);
  } else {
    noteDepth(state, key, depth);
    if (depth >= 2) state.siblingEndpointTokenKeys.add(key);
  }
  noteLineFromKey(state, key, key === activeTokenKey ? 1 : depth);
}

export function markEndpointPort(
  el: HTMLElement,
  side: "left" | "right",
  state: LitCollections,
): void {
  const traceKey = traceKeyFromElement(el);
  if (!traceKey) return;
  const sides = state.endpointPortSide.get(traceKey) ?? new Set<"left" | "right">();
  sides.add(side);
  state.endpointPortSide.set(traceKey, sides);
}

export function parseLineHandle(
  handle: string,
): { memberId: string; flowNodeId?: string } | null {
  const prefix = "preview-line-";
  if (!handle.startsWith(prefix)) return null;
  const rest = handle.slice(prefix.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash < 0) return null;
  const memberId = rest.slice(0, lastDash);
  return memberId ? { memberId } : null;
}

export function parseMemberHandle(handle: string): string | null {
  const prefix = "preview-member-";
  if (!handle.startsWith(prefix)) return null;
  return handle.slice(prefix.length) || null;
}

export function parseTopHandle(handle: string): string | null {
  const prefix = "preview-target-top-";
  if (!handle.startsWith(prefix)) return null;
  return handle.slice(prefix.length) || null;
}

export function traceKeyFromElement(el: HTMLElement): string | null {
  return (
    el.dataset.traceKey ?? el.dataset.localDefId ?? el.dataset.localTargetId ?? null
  );
}

export function flowNodeFromElement(el: HTMLElement): string | null {
  return el.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ?? null;
}

export function memberIdFromElement(el: HTMLElement): string | null {
  return el.closest<HTMLElement>("[data-member-id]")?.dataset.memberId ?? null;
}

export function kindFromElement(el: HTMLElement): SemanticTokenKind | null {
  const k = el.dataset.tokenKind;
  if (k === "class" || k === "function" || k === "type" || k === "variable") {
    return k;
  }
  return null;
}

export function elementForTraceKey(key: string): HTMLElement | null {
  const fromRegistry =
    getByTraceKey(key) ?? getByLocalDefId(key) ?? getByLocalTargetId(key);
  if (fromRegistry) return fromRegistry;

  return document.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(key)}"], [data-local-def-id="${CSS.escape(key)}"], [data-local-target-id="${CSS.escape(key)}"]`,
  );
}

export function flowNodeIdFromMemberId(memberId: string): string | null {
  const fromRegistry = getByMemberId(memberId);
  if (fromRegistry?.isConnected) {
    return (
      fromRegistry.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ??
      null
    );
  }

  const el = document.querySelector<HTMLElement>(
    `[data-member-id="${CSS.escape(memberId)}"]`,
  );
  return el?.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ?? null;
}

export function resolveEndpoint(
  ref: PreviewEdgeSpec["from"],
  kind: SemanticTokenKind,
): ResolvedEndpoint | null {
  if (ref.type === "element") {
    const el = ref.el;
    if (!el.isConnected) return null;
    const traceKey = traceKeyFromElement(el);
    if (!traceKey) return null;
    return {
      traceKey,
      memberId: memberIdFromElement(el),
      flowNodeId: flowNodeFromElement(el),
      kind: kindFromElement(el) ?? kind,
    };
  }

  const handle = ref.handle;
  const memberId = parseMemberHandle(handle);
  if (memberId) {
    return {
      traceKey: `handle::${handle}`,
      memberId,
      flowNodeId: flowNodeIdFromMemberId(memberId),
      kind,
    };
  }

  const line = parseLineHandle(handle);
  if (line) {
    return {
      traceKey: `handle::${handle}`,
      memberId: line.memberId,
      flowNodeId: flowNodeIdFromMemberId(line.memberId),
      kind,
    };
  }

  const flowNodeId = parseTopHandle(handle);
  if (flowNodeId) {
    return {
      traceKey: `handle::${handle}`,
      memberId: null,
      flowNodeId,
      kind,
    };
  }

  return null;
}
