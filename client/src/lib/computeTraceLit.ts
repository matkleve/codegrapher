import {
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
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
  return el.dataset.traceKey ?? null;
}

function flowNodeFromElement(el: HTMLElement): string | null {
  return el.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ?? null;
}

function memberIdFromElement(el: HTMLElement): string | null {
  return el.closest<HTMLElement>("[data-member-id]")?.dataset.memberId ?? null;
}

function kindFromElement(el: HTMLElement): SemanticTokenKind | null {
  const k = el.dataset.tokenKind;
  if (k === "class" || k === "function" || k === "type") return k;
  return null;
}

type ResolvedEndpoint = {
  traceKey: string;
  memberId: string | null;
  flowNodeId: string | null;
  kind: SemanticTokenKind | null;
};

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

function spreadFunctionBody(
  endpoint: ResolvedEndpoint,
  activeTokenKey: string,
  litMemberIds: Set<string>,
  ownerLitMemberIds: Set<string>,
  litLineMemberIds: Set<string>,
  litFlowNodeIds: Set<string>,
  litTokenKeys: Set<string>,
): void {
  if (endpoint.kind !== "function") return;
  if (!endpoint.memberId) return;

  litMemberIds.add(endpoint.memberId);
  litLineMemberIds.add(endpoint.memberId);
  addMemberTokenKeys(endpoint.memberId, litTokenKeys);

  const usageMember = memberIdFromUsageKey(activeTokenKey);
  if (usageMember === endpoint.memberId && activeTokenKey.includes("::")) {
    ownerLitMemberIds.add(endpoint.memberId);
  }

  if (endpoint.flowNodeId) litFlowNodeIds.add(endpoint.flowNodeId);
}

function addMemberTokenKeys(memberId: string, litTokenKeys: Set<string>): void {
  const root = document.querySelector<HTMLElement>(
    `[data-member-id="${CSS.escape(memberId)}"]`,
  );
  if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-trace-key]").forEach((el) => {
    const key = el.dataset.traceKey;
    if (key) litTokenKeys.add(key);
  });
}

export function computeTraceLit(
  activeTokenKey: string | null,
  previewEdges: PreviewEdgeSpec[],
): TraceLitState {
  if (!activeTokenKey) return EMPTY;

  const litTokenKeys = new Set<string>([activeTokenKey]);
  const endpointTokenKeys = new Set<string>([activeTokenKey]);
  const litMemberIds = new Set<string>();
  const ownerLitMemberIds = new Set<string>();
  const litLineMemberIds = new Set<string>();
  const litFlowNodeIds = new Set<string>();
  const tokenKinds = new Map<string, SemanticTokenKind>();
  const endpoints: ResolvedEndpoint[] = [];

  const activeMember = memberIdFromUsageKey(activeTokenKey);
  const activeDefMember = memberIdFromDefKey(activeTokenKey);
  const activeDefFlow = flowNodeIdFromDefKey(activeTokenKey);
  if (activeMember) litMemberIds.add(activeMember);
  if (activeDefMember) litMemberIds.add(activeDefMember);
  if (activeDefFlow) litFlowNodeIds.add(activeDefFlow);
  if (activeTokenKey.startsWith("class-def::")) {
    const el = document.querySelector<HTMLElement>(
      `[data-trace-key="${CSS.escape(activeTokenKey)}"]`,
    );
    const flowId = el?.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId;
    if (flowId) litFlowNodeIds.add(flowId);
  }

  for (const edge of previewEdges) {
    const from = resolveEndpoint(edge.from, edge.kind);
    const to = resolveEndpoint(edge.to, edge.kind);
    for (const ep of [from, to]) {
      if (!ep) continue;
      endpoints.push(ep);
      litTokenKeys.add(ep.traceKey);
      endpointTokenKeys.add(ep.traceKey);
      if (ep.kind) tokenKinds.set(ep.traceKey, ep.kind);
      if (ep.memberId) litMemberIds.add(ep.memberId);
      if (ep.flowNodeId) litFlowNodeIds.add(ep.flowNodeId);
    }
  }

  for (const ep of endpoints) {
    spreadFunctionBody(
      ep,
      activeTokenKey,
      litMemberIds,
      ownerLitMemberIds,
      litLineMemberIds,
      litFlowNodeIds,
      litTokenKeys,
    );
  }

  // Active host spread when it's a function definition or usage
  const activeUsageMember = memberIdFromUsageKey(activeTokenKey);
  if (activeUsageMember) {
    litLineMemberIds.add(activeUsageMember);
    ownerLitMemberIds.add(activeUsageMember);
    addMemberTokenKeys(activeUsageMember, litTokenKeys);
  }
  const activeMemberDef = memberIdFromDefKey(activeTokenKey);
  if (activeMemberDef) {
    litMemberIds.add(activeMemberDef);
    litLineMemberIds.add(activeMemberDef);
    addMemberTokenKeys(activeMemberDef, litTokenKeys);
    const flowId = flowNodeIdFromDefKey(activeTokenKey);
    if (flowId) litFlowNodeIds.add(flowId);
  }

  return {
    litTokenKeys,
    endpointTokenKeys,
    litMemberIds,
    ownerLitMemberIds,
    litLineMemberIds,
    litFlowNodeIds,
    tokenKinds,
  };
}

/** @internal for tests — re-export handle parsers */
export { previewMemberHandle, previewTargetTop };
