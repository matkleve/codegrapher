import {
  getAllByLocalDefId,
  getAllByLocalTargetId,
  getByLocalDefId,
  getByLocalTargetId,
  getByMemberId,
  getByTraceKey,
} from "@/lib/elementRegistry";
import {
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import { findLocalDefElement } from "@/lib/localDefElements";
import { linksForElement } from "@/lib/localDefLinks";
import { typesettingPortSides } from "@/lib/resolvePreviewAnchor";
import type { LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import {
  flowNodeIdFromDefKey,
  makeMemberDefKey,
  makeUsageTokenKey,
  memberIdFromDefKey,
  memberIdFromUsageKey,
  parseControlFlowKey,
  parseUsageTokenKey,
} from "@/lib/traceKeys";

import { depthFromHop } from "@/lib/traceDepth";
import type { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";

type RefinePreviewEdgeCache = ReturnType<typeof createRefinePreviewEdgeCache>;

export type TraceLitState = {
  litTokenKeys: ReadonlySet<string>;
  endpointTokenKeys: ReadonlySet<string>;
  /** Provenance tier 2/3 endpoints — grey sibling chip + socket. */
  siblingEndpointTokenKeys: ReadonlySet<string>;
  /** Strongest (closest) graph distance per token key — mirrors wire hop decay. */
  traceDepth: ReadonlyMap<string, number>;
  /** Per-line keyword/context distance — key `${memberId}::${lineNumber}`. */
  litLineDepth: ReadonlyMap<string, number>;
  /** Wire port sides per endpoint trace key (`from` → right, `to` → left). */
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>;
  litMemberIds: ReadonlySet<string>;
  ownerLitMemberIds: ReadonlySet<string>;
  /** @deprecated — use litLineDepth; kept for merge compat. */
  litLineMemberIds: ReadonlySet<string>;
  litFlowNodeIds: ReadonlySet<string>;
  tokenKinds: ReadonlyMap<string, SemanticTokenKind>;
};

export const EMPTY_TRACE_LIT: TraceLitState = {
  litTokenKeys: new Set(),
  endpointTokenKeys: new Set(),
  siblingEndpointTokenKeys: new Set(),
  traceDepth: new Map(),
  litLineDepth: new Map(),
  endpointPortSide: new Map(),
  litMemberIds: new Set(),
  ownerLitMemberIds: new Set(),
  litLineMemberIds: new Set(),
  litFlowNodeIds: new Set(),
  tokenKinds: new Map(),
};

/** Union two trace-lit snapshots (e.g. pinned + ephemeral hover while pin is held). */
export function mergeTraceLit(a: TraceLitState, b: TraceLitState): TraceLitState {
  return {
    litTokenKeys: new Set([...a.litTokenKeys, ...b.litTokenKeys]),
    endpointTokenKeys: new Set([...a.endpointTokenKeys, ...b.endpointTokenKeys]),
    siblingEndpointTokenKeys: new Set([
      ...a.siblingEndpointTokenKeys,
      ...b.siblingEndpointTokenKeys,
    ]),
    traceDepth: mergeTraceDepth(a.traceDepth, b.traceDepth),
    litLineDepth: mergeTraceDepth(a.litLineDepth, b.litLineDepth),
    endpointPortSide: mergeEndpointPortSides(a.endpointPortSide, b.endpointPortSide),
    litMemberIds: new Set([...a.litMemberIds, ...b.litMemberIds]),
    ownerLitMemberIds: new Set([...a.ownerLitMemberIds, ...b.ownerLitMemberIds]),
    litLineMemberIds: new Set([...a.litLineMemberIds, ...b.litLineMemberIds]),
    litFlowNodeIds: new Set([...a.litFlowNodeIds, ...b.litFlowNodeIds]),
    tokenKinds: new Map([...a.tokenKinds, ...b.tokenKinds]),
  };
}

function mergeTraceDepth(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>(a);
  for (const [key, depth] of b) {
    const prev = out.get(key);
    if (prev === undefined || depth < prev) out.set(key, depth);
  }
  return out;
}

function mergeEndpointPortSides(
  a: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
  b: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): Map<string, Set<"left" | "right">> {
  const out = new Map<string, Set<"left" | "right">>();
  for (const [key, sides] of a) out.set(key, new Set(sides));
  for (const [key, sides] of b) {
    const merged = out.get(key) ?? new Set<"left" | "right">();
    for (const side of sides) merged.add(side);
    out.set(key, merged);
  }
  return out;
}

type LitCollections = {
  litTokenKeys: Set<string>;
  endpointTokenKeys: Set<string>;
  siblingEndpointTokenKeys: Set<string>;
  traceDepth: Map<string, number>;
  litLineDepth: Map<string, number>;
  endpointPortSide: Map<string, Set<"left" | "right">>;
  litMemberIds: Set<string>;
  ownerLitMemberIds: Set<string>;
  litLineMemberIds: Set<string>;
  litFlowNodeIds: Set<string>;
  tokenKinds: Map<string, SemanticTokenKind>;
};

function noteDepth(
  state: LitCollections,
  key: string,
  depth: number,
): void {
  const prev = state.traceDepth.get(key);
  if (prev === undefined || depth < prev) {
    state.traceDepth.set(key, depth);
  }
}

function lineAnchorFromKey(
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

function litLineKey(memberId: string, lineNumber: number): string {
  return `${memberId}::${lineNumber}`;
}

function noteLineDepth(
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

function noteLineFromKey(
  state: LitCollections,
  traceKey: string,
  depth: number,
): void {
  const line = lineAnchorFromKey(traceKey);
  if (line) noteLineDepth(state, line.memberId, line.lineNumber, depth);
}

function noteSiblingEndpoint(
  state: LitCollections,
  key: string,
  activeTokenKey: string,
): void {
  if (key === activeTokenKey) return;
  state.siblingEndpointTokenKeys.add(key);
  noteDepth(state, key, 2);
}

function edgeDepth(edge: PreviewEdgeSpec): number {
  return depthFromHop(edge.hop);
}

function noteEndpointDepth(
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

function markEndpointPort(
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

type ResolvedEndpoint = {
  traceKey: string;
  memberId: string | null;
  flowNodeId: string | null;
  kind: SemanticTokenKind | null;
};

function parseLineHandle(
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

function parseMemberHandle(handle: string): string | null {
  const prefix = "preview-member-";
  if (!handle.startsWith(prefix)) return null;
  return handle.slice(prefix.length) || null;
}

function parseTopHandle(handle: string): string | null {
  const prefix = "preview-target-top-";
  if (!handle.startsWith(prefix)) return null;
  return handle.slice(prefix.length) || null;
}

function traceKeyFromElement(el: HTMLElement): string | null {
  return (
    el.dataset.traceKey ?? el.dataset.localDefId ?? el.dataset.localTargetId ?? null
  );
}

function flowNodeFromElement(el: HTMLElement): string | null {
  return el.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ?? null;
}

function memberIdFromElement(el: HTMLElement): string | null {
  return el.closest<HTMLElement>("[data-member-id]")?.dataset.memberId ?? null;
}

function kindFromElement(el: HTMLElement): SemanticTokenKind | null {
  const k = el.dataset.tokenKind;
  if (k === "class" || k === "function" || k === "type" || k === "variable") {
    return k;
  }
  return null;
}

function elementForTraceKey(key: string): HTMLElement | null {
  const fromRegistry =
    getByTraceKey(key) ?? getByLocalDefId(key) ?? getByLocalTargetId(key);
  if (fromRegistry) return fromRegistry;

  return document.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(key)}"], [data-local-def-id="${CSS.escape(key)}"], [data-local-target-id="${CSS.escape(key)}"]`,
  );
}

function absorbToken(el: HTMLElement, state: LitCollections, asEndpoint: boolean): void {
  const traceKey = traceKeyFromElement(el);
  if (!traceKey) return;

  state.litTokenKeys.add(traceKey);
  if (asEndpoint) state.endpointTokenKeys.add(traceKey);

  const kind = kindFromElement(el);
  if (kind) state.tokenKinds.set(traceKey, kind);

  const flowNodeId = flowNodeFromElement(el);
  if (flowNodeId) state.litFlowNodeIds.add(flowNodeId);

  const defId = el.dataset.localDefId;
  if (defId) absorbLocalDefSiblings(defId, state, asEndpoint, el);
}

/** Header signature chips and in-body param defs share one `localDefId` — light both. */
function absorbLocalDefSiblings(
  defId: string,
  state: LitCollections,
  asEndpoint: boolean,
  skip?: HTMLElement,
): void {
  for (const el of getAllByLocalDefId(defId)) {
    if (el === skip) continue;
    const traceKey = traceKeyFromElement(el);
    if (!traceKey) continue;

    state.litTokenKeys.add(traceKey);
    if (asEndpoint) state.endpointTokenKeys.add(traceKey);

    const kind = kindFromElement(el);
    if (kind) state.tokenKinds.set(traceKey, kind);

    const flowNodeId = flowNodeFromElement(el);
    if (flowNodeId) state.litFlowNodeIds.add(flowNodeId);
  }
}

function spreadLocalLinkChain(
  seedKey: string,
  activeTokenKey: string,
  state: LitCollections,
): void {
  const seed = elementForTraceKey(seedKey);
  if (!seed) return;

  const targetId = seed.dataset.localTargetId;
  if (targetId) {
    absorbToken(seed, state, true);

    const defEl = findLocalDefElement(document, targetId);
    if (defEl && defEl !== seed) {
      absorbToken(defEl, state, true);
      const defKey = traceKeyFromElement(defEl);
      if (defKey) noteSiblingEndpoint(state, defKey, activeTokenKey);
    }

    for (const usageEl of getAllByLocalTargetId(targetId)) {
      if (usageEl === seed) continue;
      absorbToken(usageEl, state, true);
      const usageKey = traceKeyFromElement(usageEl);
      if (usageKey) noteSiblingEndpoint(state, usageKey, activeTokenKey);
    }
    return;
  }

  const visited = new Set<HTMLElement>();
  const stack: HTMLElement[] = [seed];

  while (stack.length > 0) {
    const host = stack.pop()!;
    if (visited.has(host)) continue;
    visited.add(host);
    absorbToken(host, state, true);

    for (const { from, to } of linksForElement(host)) {
      for (const el of [from, to]) {
        if (!visited.has(el)) stack.push(el);
      }
    }
  }
}

function flowNodeIdFromMemberId(memberId: string): string | null {
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

function resolveEndpoint(
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

/** Function endpoints light their whole member body (prototype `spreadBody`). */
function spreadFunctionMember(
  memberId: string,
  activeTokenKey: string,
  state: LitCollections,
): void {
  state.litMemberIds.add(memberId);

  const usageMember = memberIdFromUsageKey(activeTokenKey);
  if (usageMember === memberId) {
    state.ownerLitMemberIds.add(memberId);
  }

  const flowId = flowNodeIdFromMemberId(memberId);
  if (flowId) state.litFlowNodeIds.add(flowId);
}

/** Light usage/def sites from edge hints even when the anchor is still a handle. */
function absorbLiveHint(
  hint: LiveAnchorHint,
  state: LitCollections,
  asEndpoint: boolean,
  activeTokenKey: string,
): void {
  if (hint.role === "usage" && hint.memberId && hint.lineNumber != null) {
    const usageKey =
      hint.traceKey ??
      (hint.tokenIndex != null
        ? makeUsageTokenKey(
            hint.flowNodeId,
            hint.memberId,
            hint.lineNumber,
            hint.tokenIndex,
            hint.token,
          )
        : null);
    if (!usageKey) return;
    state.litTokenKeys.add(usageKey);
    if (asEndpoint) state.endpointTokenKeys.add(usageKey);
    noteDepth(state, usageKey, usageKey === activeTokenKey ? 1 : 2);
    noteLineDepth(
      state,
      hint.memberId,
      hint.lineNumber,
      usageKey === activeTokenKey ? 1 : 2,
    );
    state.litFlowNodeIds.add(hint.flowNodeId);

    const chip = elementForTraceKey(usageKey);
    if (chip) absorbToken(chip, state, asEndpoint);
    return;
  }

  if (hint.role === "definition" && hint.memberId) {
    const isMemberDef =
      hint.traceKey != null && memberIdFromDefKey(hint.traceKey) != null;

    if (!isMemberDef) {
      if (!hint.traceKey) return;
      state.litTokenKeys.add(hint.traceKey);
      if (asEndpoint) state.endpointTokenKeys.add(hint.traceKey);
      const depth = hint.traceKey === activeTokenKey ? 1 : 2;
      noteDepth(state, hint.traceKey, depth);
      noteLineFromKey(state, hint.traceKey, depth);
      const chip = elementForTraceKey(hint.traceKey);
      if (chip) absorbToken(chip, state, asEndpoint);
      return;
    }

    const defKey = makeMemberDefKey(hint.flowNodeId, hint.memberId);
    state.litTokenKeys.add(defKey);
    if (asEndpoint) state.endpointTokenKeys.add(defKey);
    const depth = defKey === activeTokenKey ? 1 : 2;
    noteDepth(state, defKey, depth);
    state.litFlowNodeIds.add(hint.flowNodeId);

    const label = elementForTraceKey(defKey);
    if (label) {
      absorbToken(label, state, asEndpoint);
      if (kindFromElement(label) === "function") {
        spreadFunctionMember(hint.memberId, activeTokenKey, state);
      }
    }
  }
}

function spreadFunctionBodiesFromLit(
  activeTokenKey: string,
  state: LitCollections,
): void {
  const spreadMembers = new Set<string>();

  for (const key of state.litTokenKeys) {
    const el = elementForTraceKey(key);
    if (!el || kindFromElement(el) !== "function") continue;

    const memberId = memberIdFromElement(el);
    if (!memberId || spreadMembers.has(memberId)) continue;

    spreadMembers.add(memberId);
    spreadFunctionMember(memberId, activeTokenKey, state);
  }
}

export function computeTraceLit(
  activeTokenKey: string | null,
  previewEdges: PreviewEdgeSpec[],
  getNode?: (id: string) => Node | undefined,
  refineCache?: RefinePreviewEdgeCache,
): TraceLitState {
  if (!activeTokenKey) return EMPTY_TRACE_LIT;

  const state: LitCollections = {
    litTokenKeys: new Set<string>([activeTokenKey]),
    endpointTokenKeys: new Set<string>([activeTokenKey]),
    siblingEndpointTokenKeys: new Set<string>(),
    traceDepth: new Map<string, number>([[activeTokenKey, 1]]),
    litLineDepth: new Map<string, number>(),
    endpointPortSide: new Map<string, Set<"left" | "right">>(),
    litMemberIds: new Set<string>(),
    ownerLitMemberIds: new Set<string>(),
    litLineMemberIds: new Set<string>(),
    litFlowNodeIds: new Set<string>(),
    tokenKinds: new Map<string, SemanticTokenKind>(),
  };

  noteLineFromKey(state, activeTokenKey, 1);

  const activeDefFlow = flowNodeIdFromDefKey(activeTokenKey);
  if (activeDefFlow) state.litFlowNodeIds.add(activeDefFlow);
  if (activeTokenKey.startsWith("class-def::")) {
    const el = elementForTraceKey(activeTokenKey);
    const flowId = el?.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId;
    if (flowId) state.litFlowNodeIds.add(flowId);
  }

  for (const edge of previewEdges) {
    const hopDepth = edgeDepth(edge);
    const { from: fromRef, to: toRef } = getNode
      ? refineCache
        ? refineCache.refine(edge, getNode)
        : refinePreviewEdge(edge, getNode)
      : { from: edge.from, to: edge.to };

    if (fromRef.type === "element" && fromRef.el.isConnected) {
      if (edge.connectionKind === "typesetting" && toRef.type === "element" && toRef.el.isConnected) {
        const fromRect = fromRef.el.getBoundingClientRect();
        const toRect = toRef.el.getBoundingClientRect();
        const sides = typesettingPortSides(
          fromRect.left + fromRect.width / 2,
          toRect.left + toRect.width / 2,
        );
        markEndpointPort(fromRef.el, sides.fromSide, state);
        markEndpointPort(toRef.el, sides.toSide, state);
      } else {
        markEndpointPort(fromRef.el, "right", state);
      }
      absorbToken(fromRef.el, state, true);
      const fromKey = traceKeyFromElement(fromRef.el);
      if (fromKey) noteEndpointDepth(state, fromKey, activeTokenKey, hopDepth);
    }
    if (toRef.type === "element" && toRef.el.isConnected) {
      if (edge.connectionKind !== "typesetting") {
        markEndpointPort(toRef.el, "left", state);
      }
      absorbToken(toRef.el, state, true);
      const toKey = traceKeyFromElement(toRef.el);
      if (toKey) noteEndpointDepth(state, toKey, activeTokenKey, hopDepth);
    }

    const from = resolveEndpoint(fromRef, edge.kind);
    const to = resolveEndpoint(toRef, edge.kind);
    for (const ep of [from, to]) {
      if (!ep) continue;
      state.litTokenKeys.add(ep.traceKey);
      state.endpointTokenKeys.add(ep.traceKey);
      noteEndpointDepth(state, ep.traceKey, activeTokenKey, hopDepth);
      if (ep.kind) state.tokenKinds.set(ep.traceKey, ep.kind);
      if (ep.flowNodeId) state.litFlowNodeIds.add(ep.flowNodeId);
      if (ep.memberId && ep.kind === "function") {
        spreadFunctionMember(ep.memberId, activeTokenKey, state);
      }
    }

    if (edge.liveFrom) absorbLiveHint(edge.liveFrom, state, true, activeTokenKey);
    if (edge.liveTo) absorbLiveHint(edge.liveTo, state, true, activeTokenKey);

    if (edge.load) {
      const loadEl = document.querySelector<HTMLElement>(
        `[data-load-edge-id="${CSS.escape(edge.id)}"]`,
      );
      if (loadEl) {
        absorbToken(loadEl, state, true);
        const loadKey = traceKeyFromElement(loadEl);
        if (loadKey) {
          noteEndpointDepth(
            state,
            loadKey,
            activeTokenKey,
            depthFromHop(edge.hop),
          );
        }
      }
    }
  }

  spreadLocalLinkChain(activeTokenKey, activeTokenKey, state);

  const activeUsageMember = memberIdFromUsageKey(activeTokenKey);
  if (activeUsageMember) {
    state.ownerLitMemberIds.add(activeUsageMember);
    state.litMemberIds.add(activeUsageMember);
    const flowId = flowNodeIdFromMemberId(activeUsageMember);
    if (flowId) state.litFlowNodeIds.add(flowId);
  }

  const activeMemberDef = memberIdFromDefKey(activeTokenKey);
  if (activeMemberDef) {
    const defEl = elementForTraceKey(activeTokenKey);
    if (defEl && kindFromElement(defEl) === "function") {
      spreadFunctionMember(activeMemberDef, activeTokenKey, state);
    }
  }

  spreadFunctionBodiesFromLit(activeTokenKey, state);

  return {
    litTokenKeys: state.litTokenKeys,
    endpointTokenKeys: state.endpointTokenKeys,
    siblingEndpointTokenKeys: state.siblingEndpointTokenKeys,
    traceDepth: state.traceDepth,
    litLineDepth: state.litLineDepth,
    endpointPortSide: state.endpointPortSide,
    litMemberIds: state.litMemberIds,
    ownerLitMemberIds: state.ownerLitMemberIds,
    litLineMemberIds: state.litLineMemberIds,
    litFlowNodeIds: state.litFlowNodeIds,
    tokenKinds: state.tokenKinds,
  };
}

/** @internal for tests — re-export handle parsers */
export { previewMemberHandle, previewTargetTop };
