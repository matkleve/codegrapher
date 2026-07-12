import type { TraceLitState } from "@/lib/computeTraceLit";
import { getAllByLocalDefId, getByLocalDefId, getByLocalTargetId, getByTraceKey } from "@/lib/elementRegistry";
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
  addSocketState,
  anchorColorClasses,
  createHostState,
  type HostState,
} from "@/lib/traceLitApplyDom";

export function chipHostForTraceKey(key: string): HTMLElement | null {
  return getByTraceKey(key);
}

export function isLocalDefSiblingGroup(defId: string): boolean {
  return !defId.startsWith("local-def::member::");
}

export function litHostsForEndpoint(host: HTMLElement): HTMLElement[] {
  const defId = host.dataset.localDefId;
  if (!defId) return [host];
  const siblings = getAllByLocalDefId(defId);
  return siblings.length > 0 ? siblings : [host];
}

export function traceKeyFromHost(host: HTMLElement): string | null {
  return (
    host.dataset.traceKey ?? host.dataset.localDefId ?? host.dataset.localTargetId ?? null
  );
}

export function primaryHostInDefGroup(
  hosts: HTMLElement[],
  hoveredTokenKey: string | null,
  pinnedTokenKeys: ReadonlySet<string>,
): HTMLElement | null {
  if (hoveredTokenKey) {
    for (const host of hosts) {
      const key = traceKeyFromHost(host);
      if (key === hoveredTokenKey) return host;
    }
  }
  for (const host of hosts) {
    const key = traceKeyFromHost(host);
    if (key && pinnedTokenKeys.has(key)) return host;
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

export function depthForKey(
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

export function ensureHost(
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
export function setDepth(state: HostState, depth: number): void {
  state.depth = Math.max(state.depth, depth);
}

export function mergeClasses(state: HostState, classes: string[]): void {
  const set = new Set(state.classes);
  for (const cls of classes) set.add(cls);
  state.classes = [...set];
}

function attachEndpointSockets(
  host: HTMLElement,
  hostState: HostState,
  portSides: ReadonlySet<"left" | "right">,
  depth: number,
  pointerHover = false,
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
      pointerHover,
    });
  }
  setDepth(hostState, depth);
}

export function applyEndpointHost(
  next: Map<HTMLElement, HostState>,
  host: HTMLElement,
  depth: number,
  pinnedTokenKeys: ReadonlySet<string>,
  hoveredTokenKey: string | null,
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): void {
  const traceKey = traceKeyFromHost(host);
  const hostState = ensureHost(next, host);
  const hoverPreview = traceKey != null && hoveredTokenKey === traceKey;
  const extra: string[] = [CHIP_ON];
  if (depth === 1 && traceKey && pinnedTokenKeys.has(traceKey)) {
    extra.push(CHIP_SOURCE);
  } else if (hoverPreview) {
    extra.push(CHIP_HOVER_PREVIEW);
  }
  mergeClasses(hostState, extra);
  setDepth(hostState, depth);
  attachEndpointSockets(
    host,
    hostState,
    portSidesForHost(host, endpointPortSide),
    depth,
    hoverPreview,
  );
}

export function boostChipHost(
  next: Map<HTMLElement, HostState>,
  state: TraceLitState,
  host: HTMLElement,
  traceKey: string | null,
  pinnedTokenKeys: ReadonlySet<string>,
  forceHoverPreview = false,
): void {
  const graphDepth = depthForKey(state, traceKey, false);
  const hostState = ensureHost(next, host);
  mergeClasses(hostState, [CHIP_LIT, CHIP_ON]);
  if (traceKey && pinnedTokenKeys.has(traceKey)) {
    mergeClasses(hostState, [CHIP_SOURCE]);
  } else if (forceHoverPreview) {
    mergeClasses(hostState, [CHIP_HOVER_PREVIEW]);
  }
  setDepth(hostState, graphDepth);
  attachEndpointSockets(
    host,
    hostState,
    portSidesForHost(host, state.endpointPortSide),
    hostState.depth,
    forceHoverPreview,
  );
  boostHoveredLine(next, host);
}

/** Pointer emphasis — semantic hover fill on the token under the cursor and its line. */
export function applyHoverFocusBoost(
  next: Map<HTMLElement, HostState>,
  state: TraceLitState,
  hoveredTokenKey: string | null,
  pinnedTokenKeys: ReadonlySet<string>,
): void {
  if (!hoveredTokenKey) return;

  const boostChip = (host: HTMLElement, traceKey: string | null): void => {
    boostChipHost(next, state, host, traceKey, pinnedTokenKeys, true);
  };

  const memberSiblings = memberDefSiblingHosts(hoveredTokenKey);
  if (memberSiblings) {
    const primary = resolveMemberDefEndpoint(hoveredTokenKey);
    for (const host of memberSiblings) {
      if (primary && host !== primary && host.classList.contains("member-row-label")) {
        continue;
      }
      if (!primary || host === primary) {
        boostChip(host, hoveredTokenKey);
      }
    }
    return;
  }

  const host =
    chipHostForTraceKey(hoveredTokenKey) ??
    getByLocalDefId(hoveredTokenKey) ??
    getByLocalTargetId(hoveredTokenKey);
  if (host) boostChip(host, traceKeyFromHost(host) ?? hoveredTokenKey);
}

function boostHoveredLine(next: Map<HTMLElement, HostState>, host: HTMLElement): void {
  const line = host.closest<HTMLElement>(".code-line");
  if (!line) return;
  const lineState = ensureHost(next, line);
  mergeClasses(lineState, [LINE_LIT]);
  setDepth(lineState, 1);
}

export function boostChipForTraceKey(
  next: Map<HTMLElement, HostState>,
  state: TraceLitState,
  key: string,
  pinnedTokenKeys: ReadonlySet<string>,
): void {
  const memberSiblings = memberDefSiblingHosts(key);
  if (memberSiblings) {
    const primary = resolveMemberDefEndpoint(key);
    for (const host of memberSiblings) {
      if (primary && host !== primary && host.classList.contains("member-row-label")) {
        continue;
      }
      if (!primary || host === primary) {
        boostChipHost(next, state, host, key, pinnedTokenKeys, true);
      }
    }
    return;
  }
  const host =
    chipHostForTraceKey(key) ??
    getByLocalDefId(key) ??
    getByLocalTargetId(key);
  if (host) {
    boostChipHost(
      next,
      state,
      host,
      traceKeyFromHost(host) ?? key,
      pinnedTokenKeys,
      true,
    );
  }
}
