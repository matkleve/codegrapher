import type { TraceLitState, TraceStrength } from "@/lib/computeTraceLit";
import { allLocalDefElements } from "@/lib/localDefElements";
import { getByMemberId, getByTraceKey } from "@/lib/elementRegistry";
import {
  memberDefSiblingHosts,
  resolveMemberDefEndpoint,
} from "@/lib/memberDefAnchor";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";

const CHIP_LIT = "token-chip-lit";
const CHIP_ON = "token-chip-on";
const CHIP_SOURCE = "token-chip-source";
const CHIP_HOVER_PREVIEW = "token-chip-hover-preview";
const CHIP_ENDPOINT_SIBLING = "token-chip-endpoint-sibling";
const CHIP_HOP2 = "token-chip-hop2";
const CHIP_HOP3 = "token-chip-hop3";
const MEMBER_LIT = "trace-member-lit";
const MEMBER_OWNER_LIT = "trace-member-owner-lit";
const LINE_LIT = "trace-lit-line";
const LINE_LIT_HOP2 = "trace-lit-line-hop2";
const LINE_LIT_HOP3 = "trace-lit-line-hop3";
const ANCHOR_ON = "flow-anchor-on";
const ANCHOR_OFF = "flow-anchor-off";
const ANCHOR_ENDPOINT_SIBLING = "flow-anchor-endpoint-sibling";

type Applied = {
  el: HTMLElement;
  classes: string[];
  restoreAnchorOff?: HTMLElement[];
};

let previous: Applied[] = [];

function chipHostForTraceKey(key: string): HTMLElement | null {
  return getByTraceKey(key);
}

/** Param/local lexical groups only — not member-row title defs. */
function isLocalDefSiblingGroup(defId: string): boolean {
  return !defId.startsWith("local-def::member::");
}

function litHostsForEndpoint(host: HTMLElement): HTMLElement[] {
  const defId = host.dataset.localDefId;
  if (!defId) return [host];

  const pane = document.querySelector(".graph-pane");
  if (!pane) return [host];

  const siblings = allLocalDefElements(pane, defId);
  return siblings.length > 0 ? siblings : [host];
}

function clearPrevious(): void {
  for (const entry of previous) {
    const { el, classes, restoreAnchorOff } = entry;
    if (el.isConnected) {
      for (const cls of classes) {
        el.classList.remove(cls);
      }
    }
    if (restoreAnchorOff) {
      for (const anchor of restoreAnchorOff) {
        if (!anchor.isConnected) continue;
        anchor.classList.remove(ANCHOR_ON, ANCHOR_ENDPOINT_SIBLING);
        anchor.classList.add(ANCHOR_OFF, "bg-border");
        removeAnchorColorClasses(anchor);
      }
    }
  }
  previous = [];
}

function track(
  el: HTMLElement,
  classes: string[],
  restoreAnchorOff?: HTMLElement[],
): void {
  const toAdd = classes.filter((c) => !el.classList.contains(c));
  if (toAdd.length === 0 && !restoreAnchorOff?.length) return;
  for (const cls of toAdd) {
    el.classList.add(cls);
  }
  previous.push({ el, classes: toAdd, restoreAnchorOff });
}

function isDefinitionHost(host: HTMLElement): boolean {
  return (
    host.classList.contains("token-def-label") ||
    host.dataset.symbolRole === "definition" ||
    host.dataset.localDefId != null
  );
}

function anchorColorClasses(host: HTMLElement): string[] {
  if (host.dataset.controlFlowRole) {
    return ["bg-[color:var(--edge-control-flow)]", "text-[color:var(--edge-control-flow)]"];
  }
  const kind = host.dataset.tokenKind as SemanticTokenKind | undefined;
  if (kind && kind in TOKEN_ANCHOR) {
    return TOKEN_ANCHOR[kind].split(/\s+/).filter(Boolean);
  }
  return ["bg-border"];
}

function removeAnchorColorClasses(anchor: HTMLElement): void {
  for (const color of Object.values(TOKEN_ANCHOR)) {
    for (const cls of color.split(/\s+/)) {
      anchor.classList.remove(cls);
    }
  }
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

function applyEndpointSockets(
  host: HTMLElement,
  portSides: ReadonlySet<"left" | "right">,
  isSibling: boolean,
): HTMLElement[] {
  const restore: HTMLElement[] = [];
  const left = host.querySelector<HTMLElement>('[data-flow-anchor="left"]');
  const right = host.querySelector<HTMLElement>('[data-flow-anchor="right"]');
  for (const side of portSides) {
    const socket = side === "right" ? right : left;
    if (!socket) continue;

    restore.push(socket);
    socket.classList.remove(ANCHOR_OFF, ANCHOR_ENDPOINT_SIBLING);
    socket.classList.add(ANCHOR_ON);
    removeAnchorColorClasses(socket);
    if (isSibling) {
      socket.classList.add(ANCHOR_ENDPOINT_SIBLING, "bg-border", "text-border");
    } else {
      socket.classList.add(...anchorColorClasses(host));
    }
  }
  return restore;
}

function hopClasses(tier: TraceStrength): string[] {
  if (tier === 3) return [CHIP_HOP3, CHIP_ENDPOINT_SIBLING];
  if (tier === 2) return [CHIP_HOP2, CHIP_ENDPOINT_SIBLING];
  return [];
}

function strengthForKey(
  state: TraceLitState,
  key: string | null,
  fallbackSibling: boolean,
): TraceStrength {
  if (key) {
    const fromMap = state.traceStrength.get(key);
    if (fromMap != null) return fromMap;
  }
  return fallbackSibling ? 2 : 1;
}

function lineLitClasses(tier: TraceStrength): string[] {
  const classes = [LINE_LIT];
  if (tier === 3) classes.push(LINE_LIT_HOP3);
  else if (tier === 2) classes.push(LINE_LIT_HOP2);
  return classes;
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

function applyEndpointHost(
  host: HTMLElement,
  tier: TraceStrength,
  pinnedTokenKeys: ReadonlySet<string>,
  hoveredTokenKey: string | null,
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): void {
  const traceKey = traceKeyFromHost(host);
  const extra: string[] = [CHIP_ON, ...hopClasses(tier)];
  if (tier === 1) {
    if (traceKey && pinnedTokenKeys.has(traceKey)) {
      extra.push(CHIP_SOURCE);
    } else if (traceKey && hoveredTokenKey === traceKey) {
      extra.push(CHIP_HOVER_PREVIEW);
    }
  }
  const restoreAnchors = applyEndpointSockets(
    host,
    portSidesForHost(host, endpointPortSide),
    tier >= 2,
  );
  track(host, extra, restoreAnchors);
}

export type TraceLitApplyOptions = {
  pinnedTokenKeys: ReadonlySet<string>;
  hoveredTokenKey: string | null;
};

/** Apply trace-lit classes imperatively — O(trace size), no React re-renders. */
export function applyTraceLit(
  state: TraceLitState,
  { pinnedTokenKeys, hoveredTokenKey }: TraceLitApplyOptions,
): void {
  clearPrevious();

  for (const key of state.litTokenKeys) {
    const tier = strengthForKey(state, key, false);
    const hop = hopClasses(tier);
    const memberSiblings = memberDefSiblingHosts(key);
    if (memberSiblings) {
      for (const host of memberSiblings) track(host, [CHIP_LIT, ...hop]);
      continue;
    }
    const host = chipHostForTraceKey(key);
    if (host) track(host, [CHIP_LIT, ...hop]);
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
        const tier = strengthForKey(state, key, isSibling);
        applyEndpointHost(
          litHost,
          tier,
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
        const tier = strengthForKey(
          state,
          traceKeyFromHost(litHost),
          isSibling,
        );
        applyEndpointHost(
          litHost,
          tier,
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
    const tier = strengthForKey(state, traceKey, isProvenanceSibling);
    applyEndpointHost(
      host,
      tier,
      pinnedTokenKeys,
      hoveredTokenKey,
      state.endpointPortSide,
    );
  }

  for (const memberId of state.litMemberIds) {
    const row = getByMemberId(memberId);
    if (row) track(row, [MEMBER_LIT]);
  }

  for (const memberId of state.ownerLitMemberIds) {
    const row = getByMemberId(memberId);
    if (row) track(row, [MEMBER_OWNER_LIT]);
  }

  for (const [lineKey, tier] of state.litLineStrength) {
    const sep = lineKey.indexOf("::");
    if (sep < 0) continue;
    const memberId = lineKey.slice(0, sep);
    const lineNumber = lineKey.slice(sep + 2);
    const row = getByMemberId(memberId);
    if (!row) continue;
    const line = row.querySelector<HTMLElement>(
      `.code-line[data-line-number="${CSS.escape(lineNumber)}"]`,
    );
    if (line) track(line, lineLitClasses(tier));
  }
}

export function clearTraceLit(): void {
  clearPrevious();
}
