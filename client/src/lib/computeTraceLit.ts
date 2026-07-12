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
import { depthFromHop } from "@/lib/traceDepth";
import type { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { typesettingPortSides } from "@/lib/resolvePreviewAnchor";
import {
  edgeDepth,
  elementForTraceKey,
  flowNodeIdFromMemberId,
  kindFromElement,
  markEndpointPort,
  noteEndpointDepth,
  noteLineFromKey,
  resolveEndpoint,
  traceKeyFromElement,
} from "@/lib/traceLitDepth";
import {
  absorbLiveHint,
  absorbToken,
  spreadFunctionBodiesFromLit,
  spreadFunctionMember,
  spreadLocalLinkChain,
} from "@/lib/traceLitSpread";
import {
  EMPTY_TRACE_LIT,
  type LitCollections,
  type TraceLitState,
} from "@/lib/traceLitState";

type RefinePreviewEdgeCache = ReturnType<typeof createRefinePreviewEdgeCache>;

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

export type { TraceLitState } from "@/lib/traceLitState";
export { EMPTY_TRACE_LIT, mergeTraceLit } from "@/lib/traceLitState";
