import { getAllByLocalDefId, getAllByLocalTargetId } from "@/lib/elementRegistry";
import { findLocalDefElement } from "@/lib/localDefElements";
import { linksForElement } from "@/lib/localDefLinks";
import type { LiveAnchorHint } from "@/lib/previewEdgeTypes";
import {
  makeMemberDefKey,
  makeUsageTokenKey,
  memberIdFromDefKey,
  memberIdFromUsageKey,
} from "@/lib/traceKeys";
import {
  elementForTraceKey,
  flowNodeFromElement,
  flowNodeIdFromMemberId,
  kindFromElement,
  memberIdFromElement,
  noteDepth,
  noteLineDepth,
  noteLineFromKey,
  noteSiblingEndpoint,
  traceKeyFromElement,
} from "@/lib/traceLitDepth";
import type { LitCollections } from "@/lib/traceLitState";

export function absorbToken(
  el: HTMLElement,
  state: LitCollections,
  asEndpoint: boolean,
): void {
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

export function spreadLocalLinkChain(
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

/** Function endpoints light their whole member body (prototype `spreadBody`). */
export function spreadFunctionMember(
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
export function absorbLiveHint(
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

export function spreadFunctionBodiesFromLit(
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
