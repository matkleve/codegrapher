import type { TraceLitState } from "@/lib/computeTraceLit";
import { getByMemberId } from "@/lib/elementRegistry";
import {
  memberDefSiblingHosts,
  resolveMemberDefEndpoint,
} from "@/lib/memberDefAnchor";
import {
  CHIP_LIT,
  CHIP_ON,
  LINE_LIT,
  MEMBER_LIT,
  MEMBER_OWNER_LIT,
  clearTraceLitDom,
  syncTraceLitDom,
  unwindTraceLitDom,
  type HostState,
} from "@/lib/traceLitApplyDom";
import {
  applyEndpointHost,
  applyHoverFocusBoost,
  chipHostForTraceKey,
  depthForKey,
  ensureHost,
  isLocalDefSiblingGroup,
  litHostsForEndpoint,
  mergeClasses,
  primaryHostInDefGroup,
  setDepth,
  traceKeyFromHost,
} from "@/lib/traceLitApplyHost";
import {
  applyHoveredWireEndpointBoost,
  applyWireHoverBoost,
} from "@/lib/traceLitApplyWire";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";

export type TraceLitApplyOptions = {
  pinnedTokenKeys: ReadonlySet<string>;
  hoveredTokenKey: string | null;
  previewEdges?: PreviewEdgeSpec[];
  getNode?: (id: string) => Node | undefined;
};

/** Apply trace-lit classes imperatively — diffs against prior apply. */
export function applyTraceLit(
  state: TraceLitState,
  { pinnedTokenKeys, hoveredTokenKey, previewEdges = [], getNode }: TraceLitApplyOptions,
): void {
  const next = new Map<HTMLElement, HostState>();

  for (const key of state.litTokenKeys) {
    const depth = depthForKey(state, key, false);
    const litOnly = !state.endpointTokenKeys.has(key);
    const memberSiblings = memberDefSiblingHosts(key);
    if (memberSiblings) {
      for (const host of memberSiblings) {
        const hostState = ensureHost(next, host);
        mergeClasses(hostState, litOnly ? [CHIP_LIT, CHIP_ON] : [CHIP_LIT]);
        setDepth(hostState, depth);
      }
      continue;
    }
    const host = chipHostForTraceKey(key);
    if (!host) continue;
    const hostState = ensureHost(next, host);
    mergeClasses(hostState, litOnly ? [CHIP_LIT, CHIP_ON] : [CHIP_LIT]);
    setDepth(hostState, depth);
  }

  const processedDefIds = new Set<string>();
  const processedHosts = new Set<HTMLElement>();
  const processedMemberDefKeys = new Set<string>();

  for (const key of state.endpointTokenKeys) {
    const memberSiblings = memberDefSiblingHosts(key);
    if (memberSiblings) {
      if (processedMemberDefKeys.has(key)) continue;
      processedMemberDefKeys.add(key);

      const primary = resolveMemberDefEndpoint(key);
      for (const litHost of memberSiblings) {
        if (
          primary !== null &&
          litHost !== primary &&
          litHost.classList.contains("member-row-label")
        ) {
          continue;
        }
        const isSibling = primary !== null ? litHost !== primary : true;
        applyEndpointHost(
          next,
          litHost,
          depthForKey(state, key, isSibling),
          pinnedTokenKeys,
          hoveredTokenKey,
          state.endpointPortSide,
        );
      }
      continue;
    }

    const host = chipHostForTraceKey(key);
    if (!host) continue;

    const defId = host.dataset.localDefId;
    if (defId && isLocalDefSiblingGroup(defId)) {
      if (processedDefIds.has(defId)) continue;
      processedDefIds.add(defId);

      const group = litHostsForEndpoint(host);
      const primary = primaryHostInDefGroup(group, hoveredTokenKey, pinnedTokenKeys);
      for (const litHost of group) {
        const isSibling = primary !== null ? litHost !== primary : true;
        applyEndpointHost(
          next,
          litHost,
          depthForKey(state, traceKeyFromHost(litHost), isSibling),
          pinnedTokenKeys,
          hoveredTokenKey,
          state.endpointPortSide,
        );
      }
      continue;
    }

    if (processedHosts.has(host)) continue;
    processedHosts.add(host);
    const traceKey = traceKeyFromHost(host);
    const isProvenanceSibling =
      traceKey != null && state.siblingEndpointTokenKeys.has(traceKey);
    applyEndpointHost(
      next,
      host,
      depthForKey(state, traceKey, isProvenanceSibling),
      pinnedTokenKeys,
      hoveredTokenKey,
      state.endpointPortSide,
    );
  }

  for (const memberId of state.litMemberIds) {
    const row = getByMemberId(memberId);
    if (row) mergeClasses(ensureHost(next, row), [MEMBER_LIT]);
  }

  for (const memberId of state.ownerLitMemberIds) {
    const row = getByMemberId(memberId);
    if (row) mergeClasses(ensureHost(next, row), [MEMBER_OWNER_LIT]);
  }

  for (const [lineKey, depth] of state.litLineDepth) {
    const sep = lineKey.indexOf("::");
    if (sep < 0) continue;
    const memberId = lineKey.slice(0, sep);
    const lineNumber = lineKey.slice(sep + 2);
    const row = getByMemberId(memberId);
    if (!row) continue;
    const line = row.querySelector<HTMLElement>(
      `.code-line[data-line-number="${CSS.escape(lineNumber)}"]`,
    );
    if (!line) continue;
    const lineState = ensureHost(next, line);
    mergeClasses(lineState, [LINE_LIT]);
    setDepth(lineState, depth);
  }

  applyHoverFocusBoost(next, state, hoveredTokenKey, pinnedTokenKeys);
  if (getNode && previewEdges.length > 0) {
    applyHoveredWireEndpointBoost(
      next,
      state,
      previewEdges,
      getNode,
      hoveredTokenKey,
      pinnedTokenKeys,
    );
    applyWireHoverBoost(next, state, previewEdges, getNode, pinnedTokenKeys);
  }

  for (const state of next.values()) {
    if (state.depth <= 0) state.depth = 1;
  }

  syncTraceLitDom(next);
}

export function clearTraceLit(): void {
  clearTraceLitDom();
}

export function unwindTraceLit(): void {
  unwindTraceLitDom();
}
