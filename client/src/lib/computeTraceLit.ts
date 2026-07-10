import {
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import { linksForElement } from "@/lib/linksForElement";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import {
  flowNodeIdFromDefKey,
  memberIdFromDefKey,
  memberIdFromUsageKey,
} from "@/lib/traceKeys";

export type TraceLitState = {
  litTokenKeys: ReadonlySet<string>;
  endpointTokenKeys: ReadonlySet<string>;
  litMemberIds: ReadonlySet<string>;
  ownerLitMemberIds: ReadonlySet<string>;
  litLineMemberIds: ReadonlySet<string>;
  litFlowNodeIds: ReadonlySet<string>;
  tokenKinds: ReadonlyMap<string, SemanticTokenKind>;
};

const EMPTY: TraceLitState = {
  litTokenKeys: new Set(),
  endpointTokenKeys: new Set(),
  litMemberIds: new Set(),
  ownerLitMemberIds: new Set(),
  litLineMemberIds: new Set(),
  litFlowNodeIds: new Set(),
  tokenKinds: new Map(),
};

type LitCollections = {
  litTokenKeys: Set<string>;
  endpointTokenKeys: Set<string>;
  litMemberIds: Set<string>;
  ownerLitMemberIds: Set<string>;
  litLineMemberIds: Set<string>;
  litFlowNodeIds: Set<string>;
  tokenKinds: Map<string, SemanticTokenKind>;
};

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
}

function spreadLocalLinkChain(seedKey: string, state: LitCollections): void {
  const seed = elementForTraceKey(seedKey);
  if (!seed) return;

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
  state.litLineMemberIds.add(memberId);
  addMemberTokenKeys(memberId, state.litTokenKeys);

  const usageMember = memberIdFromUsageKey(activeTokenKey);
  if (usageMember === memberId) {
    state.ownerLitMemberIds.add(memberId);
  }

  const flowId = flowNodeIdFromMemberId(memberId);
  if (flowId) state.litFlowNodeIds.add(flowId);
}

function addMemberTokenKeys(memberId: string, litTokenKeys: Set<string>): void {
  const root = document.querySelector<HTMLElement>(
    `[data-member-id="${CSS.escape(memberId)}"]`,
  );
  if (!root) return;
  root
    .querySelectorAll<HTMLElement>("[data-trace-key], [data-local-def-id], [data-local-target-id]")
    .forEach((el) => {
      const key = traceKeyFromElement(el);
      if (key) litTokenKeys.add(key);
    });
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
): TraceLitState {
  if (!activeTokenKey) return EMPTY;

  const state: LitCollections = {
    litTokenKeys: new Set<string>([activeTokenKey]),
    endpointTokenKeys: new Set<string>([activeTokenKey]),
    litMemberIds: new Set<string>(),
    ownerLitMemberIds: new Set<string>(),
    litLineMemberIds: new Set<string>(),
    litFlowNodeIds: new Set<string>(),
    tokenKinds: new Map<string, SemanticTokenKind>(),
  };

  const activeDefFlow = flowNodeIdFromDefKey(activeTokenKey);
  if (activeDefFlow) state.litFlowNodeIds.add(activeDefFlow);
  if (activeTokenKey.startsWith("class-def::")) {
    const el = elementForTraceKey(activeTokenKey);
    const flowId = el?.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId;
    if (flowId) state.litFlowNodeIds.add(flowId);
  }

  for (const edge of previewEdges) {
    const from = resolveEndpoint(edge.from, edge.kind);
    const to = resolveEndpoint(edge.to, edge.kind);
    for (const ep of [from, to]) {
      if (!ep) continue;
      state.litTokenKeys.add(ep.traceKey);
      state.endpointTokenKeys.add(ep.traceKey);
      if (ep.kind) state.tokenKinds.set(ep.traceKey, ep.kind);
      if (ep.flowNodeId) state.litFlowNodeIds.add(ep.flowNodeId);
    }
  }

  spreadLocalLinkChain(activeTokenKey, state);

  const activeUsageMember = memberIdFromUsageKey(activeTokenKey);
  if (activeUsageMember) {
    state.ownerLitMemberIds.add(activeUsageMember);
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
    litMemberIds: state.litMemberIds,
    ownerLitMemberIds: state.ownerLitMemberIds,
    litLineMemberIds: state.litLineMemberIds,
    litFlowNodeIds: state.litFlowNodeIds,
    tokenKinds: state.tokenKinds,
  };
}

/** @internal for tests — re-export handle parsers */
export { previewMemberHandle, previewTargetTop };
