import {
  getByLocalDefId,
  getByLocalTargetId,
  getByMemberId,
  getByTraceKey,
} from "@/lib/elementRegistry";
import {
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import { allLocalDefElements, findLocalDefElement } from "@/lib/localDefElements";
import { linksForElement } from "@/lib/localDefLinks";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
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

export type TraceStrength = 1 | 2 | 3;

export type TraceLitState = {
  litTokenKeys: ReadonlySet<string>;
  endpointTokenKeys: ReadonlySet<string>;
  /** Provenance tier 2/3 endpoints — grey sibling chip + socket. */
  siblingEndpointTokenKeys: ReadonlySet<string>;
  /** Strongest (lowest) trace tier per token key — mirrors wire hop decay. */
  traceStrength: ReadonlyMap<string, TraceStrength>;
  /** Per-line keyword/context tier — key `${memberId}::${lineNumber}`. */
  litLineStrength: ReadonlyMap<string, TraceStrength>;
  /** Wire port sides per endpoint trace key (`from` → right, `to` → left). */
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>;
  litMemberIds: ReadonlySet<string>;
  ownerLitMemberIds: ReadonlySet<string>;
  /** @deprecated — use litLineStrength; kept for merge compat. */
  litLineMemberIds: ReadonlySet<string>;
  litFlowNodeIds: ReadonlySet<string>;
  tokenKinds: ReadonlyMap<string, SemanticTokenKind>;
};

export const EMPTY_TRACE_LIT: TraceLitState = {
  litTokenKeys: new Set(),
  endpointTokenKeys: new Set(),
  siblingEndpointTokenKeys: new Set(),
  traceStrength: new Map(),
  litLineStrength: new Map(),
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
    traceStrength: mergeTraceStrength(a.traceStrength, b.traceStrength),
    litLineStrength: mergeTraceStrength(a.litLineStrength, b.litLineStrength),
    endpointPortSide: mergeEndpointPortSides(a.endpointPortSide, b.endpointPortSide),
    litMemberIds: new Set([...a.litMemberIds, ...b.litMemberIds]),
    ownerLitMemberIds: new Set([...a.ownerLitMemberIds, ...b.ownerLitMemberIds]),
    litLineMemberIds: new Set([...a.litLineMemberIds, ...b.litLineMemberIds]),
    litFlowNodeIds: new Set([...a.litFlowNodeIds, ...b.litFlowNodeIds]),
    tokenKinds: new Map([...a.tokenKinds, ...b.tokenKinds]),
  };
}

function mergeTraceStrength(
  a: ReadonlyMap<string, TraceStrength>,
  b: ReadonlyMap<string, TraceStrength>,
): Map<string, TraceStrength> {
  const out = new Map<string, TraceStrength>(a);
  for (const [key, tier] of b) {
    const prev = out.get(key);
    if (prev === undefined || tier < prev) out.set(key, tier);
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
  traceStrength: Map<string, TraceStrength>;
  litLineStrength: Map<string, TraceStrength>;
  endpointPortSide: Map<string, Set<"left" | "right">>;
  litMemberIds: Set<string>;
  ownerLitMemberIds: Set<string>;
  litLineMemberIds: Set<string>;
  litFlowNodeIds: Set<string>;
  tokenKinds: Map<string, SemanticTokenKind>;
};

function noteStrength(
  state: LitCollections,
  key: string,
  tier: TraceStrength,
): void {
  const prev = state.traceStrength.get(key);
  if (prev === undefined || tier < prev) {
    state.traceStrength.set(key, tier);
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

function noteLineStrength(
  state: LitCollections,
  memberId: string,
  lineNumber: number,
  tier: TraceStrength,
): void {
  const key = litLineKey(memberId, lineNumber);
  const prev = state.litLineStrength.get(key);
  if (prev === undefined || tier < prev) {
    state.litLineStrength.set(key, tier);
  }
}

function noteLineFromKey(
  state: LitCollections,
  traceKey: string,
  tier: TraceStrength,
): void {
  const line = lineAnchorFromKey(traceKey);
  if (line) noteLineStrength(state, line.memberId, line.lineNumber, tier);
}

function noteSiblingEndpoint(
  state: LitCollections,
  key: string,
  activeTokenKey: string,
): void {
  if (key === activeTokenKey) return;
  state.siblingEndpointTokenKeys.add(key);
  noteStrength(state, key, 2);
}

function edgeHopTier(edge: PreviewEdgeSpec): TraceStrength {
  if (edge.hop === 3) return 3;
  if (edge.hop === 2) return 2;
  return 1;
}

function noteEndpointStrength(
  state: LitCollections,
  key: string,
  activeTokenKey: string,
  tier: TraceStrength,
): void {
  if (key === activeTokenKey) {
    noteStrength(state, key, 1);
  } else {
    noteStrength(state, key, tier);
    if (tier >= 2) state.siblingEndpointTokenKeys.add(key);
  }
  noteLineFromKey(state, key, key === activeTokenKey ? 1 : tier);
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
  const pane = document.querySelector(".graph-pane");
  if (!pane) return;

  for (const el of allLocalDefElements(pane, defId)) {
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

    const pane = document.querySelector(".graph-pane");
    if (!pane) return;

    const defEl = findLocalDefElement(pane, targetId);
    if (defEl && defEl !== seed) {
      absorbToken(defEl, state, true);
      const defKey = traceKeyFromElement(defEl);
      if (defKey) noteSiblingEndpoint(state, defKey, activeTokenKey);
    }

    for (const usageEl of pane.querySelectorAll<HTMLElement>(
      `[data-local-target-id="${CSS.escape(targetId)}"]`,
    )) {
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
    noteStrength(state, usageKey, usageKey === activeTokenKey ? 1 : 2);
    noteLineStrength(state, hint.memberId, hint.lineNumber, usageKey === activeTokenKey ? 1 : 2);
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
      const tier: TraceStrength = hint.traceKey === activeTokenKey ? 1 : 2;
      noteStrength(state, hint.traceKey, tier);
      noteLineFromKey(state, hint.traceKey, tier);
      const chip = elementForTraceKey(hint.traceKey);
      if (chip) absorbToken(chip, state, asEndpoint);
      return;
    }

    const defKey = makeMemberDefKey(hint.flowNodeId, hint.memberId);
    state.litTokenKeys.add(defKey);
    if (asEndpoint) state.endpointTokenKeys.add(defKey);
    const tier: TraceStrength = defKey === activeTokenKey ? 1 : 2;
    noteStrength(state, defKey, tier);
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
): TraceLitState {
  if (!activeTokenKey) return EMPTY_TRACE_LIT;

  const state: LitCollections = {
    litTokenKeys: new Set<string>([activeTokenKey]),
    endpointTokenKeys: new Set<string>([activeTokenKey]),
    siblingEndpointTokenKeys: new Set<string>(),
    traceStrength: new Map<string, TraceStrength>([[activeTokenKey, 1]]),
    litLineStrength: new Map<string, TraceStrength>(),
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
    const hopTier = edgeHopTier(edge);
    const { from: fromRef, to: toRef } = getNode
      ? refinePreviewEdge(edge, getNode)
      : { from: edge.from, to: edge.to };

    if (fromRef.type === "element" && fromRef.el.isConnected) {
      markEndpointPort(fromRef.el, "right", state);
      absorbToken(fromRef.el, state, true);
      const fromKey = traceKeyFromElement(fromRef.el);
      if (fromKey) noteEndpointStrength(state, fromKey, activeTokenKey, hopTier);
    }
    if (toRef.type === "element" && toRef.el.isConnected) {
      markEndpointPort(toRef.el, "left", state);
      absorbToken(toRef.el, state, true);
      const toKey = traceKeyFromElement(toRef.el);
      if (toKey) noteEndpointStrength(state, toKey, activeTokenKey, hopTier);
    }

    const from = resolveEndpoint(fromRef, edge.kind);
    const to = resolveEndpoint(toRef, edge.kind);
    for (const ep of [from, to]) {
      if (!ep) continue;
      state.litTokenKeys.add(ep.traceKey);
      state.endpointTokenKeys.add(ep.traceKey);
      noteEndpointStrength(state, ep.traceKey, activeTokenKey, hopTier);
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
          const loadTier: TraceStrength = edge.hop === 3 ? 3 : edge.hop === 2 ? 2 : 1;
          noteEndpointStrength(state, loadKey, activeTokenKey, loadTier);
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
    traceStrength: state.traceStrength,
    litLineStrength: state.litLineStrength,
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
