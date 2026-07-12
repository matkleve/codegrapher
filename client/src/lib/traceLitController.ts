import type { TraceLitState } from "@/lib/computeTraceLit";
import { getAllByLocalDefId, getByMemberId, getByTraceKey } from "@/lib/elementRegistry";
import {
  memberDefSiblingHosts,
  resolveMemberDefEndpoint,
} from "@/lib/memberDefAnchor";
import {
  CHIP_HOVER_PREVIEW,
  CHIP_LIT,
  CHIP_ON,
  CHIP_SOURCE,
  LINE_LIT,
  MEMBER_LIT,
  MEMBER_OWNER_LIT,
  addSocketState,
  anchorColorClasses,
  clearTraceLitDom,
  createHostState,
  syncTraceLitDom,
  type HostState,
} from "@/lib/traceLitApply";

function chipHostForTraceKey(key: string): HTMLElement | null {
  return getByTraceKey(key);
}

function isLocalDefSiblingGroup(defId: string): boolean {
  return !defId.startsWith("local-def::member::");
}

function litHostsForEndpoint(host: HTMLElement): HTMLElement[] {
  const defId = host.dataset.localDefId;
  if (!defId) return [host];
  const siblings = getAllByLocalDefId(defId);
  return siblings.length > 0 ? siblings : [host];
}

function traceKeyFromHost(host: HTMLElement): string | null {
  return (
    host.dataset.traceKey ?? host.dataset.localDefId ?? host.dataset.localTargetId ?? null
  );
}

function primaryHostInDefGroup(
  hosts: HTMLElement[],
  hoveredTokenKey: string | null,
  pinnedTokenKeys: ReadonlySet<string>,
): HTMLElement | null {
  for (const host of hosts) {
    const key = traceKeyFromHost(host);
    if (key && (hoveredTokenKey === key || pinnedTokenKeys.has(key))) {
      return host;
    }
  }
  return null;
}

function isDefinitionHost(host: HTMLElement): boolean {
  return (
    host.classList.contains("token-def-label") ||
    host.dataset.symbolRole === "definition" ||
    host.dataset.localDefId != null
  );
}

function depthForKey(
  state: TraceLitState,
  key: string | null,
  fallbackSibling = false,
): number {
  if (key) {
    const fromMap = state.traceDepth.get(key);
    if (fromMap != null) return fromMap;
  }
  return fallbackSibling ? 2 : 1;
}

function portSidesForHost(
  host: HTMLElement,
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): ReadonlySet<"left" | "right"> {
  const traceKey = traceKeyFromHost(host);
  if (traceKey) {
    const fromEdge = endpointPortSide.get(traceKey);
    if (fromEdge && fromEdge.size > 0) return fromEdge;
  }
  return new Set([isDefinitionHost(host) ? "right" : "left"]);
}

function ensureHost(
  next: Map<HTMLElement, HostState>,
  el: HTMLElement,
): HostState {
  let state = next.get(el);
  if (!state) {
    state = createHostState([], 0);
    next.set(el, state);
  }
  return state;
}

/** Furthest graph distance wins — sibling fade overrides co-located lit at depth 1. */
function setDepth(state: HostState, depth: number): void {
  state.depth = Math.max(state.depth, depth);
}

function mergeClasses(state: HostState, classes: string[]): void {
  const set = new Set(state.classes);
  for (const cls of classes) set.add(cls);
  state.classes = [...set];
}

function attachEndpointSockets(
  host: HTMLElement,
  hostState: HostState,
  portSides: ReadonlySet<"left" | "right">,
  depth: number,
): void {
  const left = host.querySelector<HTMLElement>('[data-flow-anchor="left"]');
  const right = host.querySelector<HTMLElement>('[data-flow-anchor="right"]');
  for (const side of portSides) {
    const socket = side === "right" ? right : left;
    if (!socket) continue;
    addSocketState(hostState, socket, {
      endpointSibling: depth >= 2,
      depth,
      colorClasses: anchorColorClasses(host),
    });
  }
  setDepth(hostState, depth);
}

function applyEndpointHost(
  next: Map<HTMLElement, HostState>,
  host: HTMLElement,
  depth: number,
  pinnedTokenKeys: ReadonlySet<string>,
  hoveredTokenKey: string | null,
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): void {
  const traceKey = traceKeyFromHost(host);
  const hostState = ensureHost(next, host);
  const extra: string[] = [CHIP_ON];
  if (depth === 1) {
    if (traceKey && pinnedTokenKeys.has(traceKey)) {
      extra.push(CHIP_SOURCE);
    } else if (traceKey && hoveredTokenKey === traceKey) {
      extra.push(CHIP_HOVER_PREVIEW);
    }
  }
  mergeClasses(hostState, extra);
  setDepth(hostState, depth);
  attachEndpointSockets(
    host,
    hostState,
    portSidesForHost(host, endpointPortSide),
    depth,
  );
}

export type TraceLitApplyOptions = {
  pinnedTokenKeys: ReadonlySet<string>;
  hoveredTokenKey: string | null;
};

/** Apply trace-lit classes imperatively — diffs against prior apply. */
export function applyTraceLit(
  state: TraceLitState,
  { pinnedTokenKeys, hoveredTokenKey }: TraceLitApplyOptions,
): void {
  const next = new Map<HTMLElement, HostState>();

  for (const key of state.litTokenKeys) {
    const depth = depthForKey(state, key, false);
    const memberSiblings = memberDefSiblingHosts(key);
    if (memberSiblings) {
      for (const host of memberSiblings) {
        const hostState = ensureHost(next, host);
        mergeClasses(hostState, [CHIP_LIT]);
        setDepth(hostState, depth);
      }
      continue;
    }
    const host = chipHostForTraceKey(key);
    if (!host) continue;
    const hostState = ensureHost(next, host);
    mergeClasses(hostState, [CHIP_LIT]);
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

  for (const state of next.values()) {
    if (state.depth <= 0) state.depth = 1;
  }

  syncTraceLitDom(next);
}

export function clearTraceLit(): void {
  clearTraceLitDom();
}
