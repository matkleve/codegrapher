import type { TraceLitState } from "@/lib/computeTraceLit";
import { allLocalDefElements } from "@/lib/localDefElements";
import { getByMemberId, getByTraceKey } from "@/lib/elementRegistry";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";

const CHIP_LIT = "token-chip-lit";
const CHIP_ON = "token-chip-on";
const CHIP_SOURCE = "token-chip-source";
const CHIP_HOVER_PREVIEW = "token-chip-hover-preview";
const CHIP_ENDPOINT_SIBLING = "token-chip-endpoint-sibling";
const MEMBER_LIT = "trace-member-lit";
const MEMBER_OWNER_LIT = "trace-member-owner-lit";
const LINE_LIT = "trace-lit-line";
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

function applyEndpointSockets(host: HTMLElement, isSibling: boolean): HTMLElement[] {
  const restore: HTMLElement[] = [];
  const isDef = isDefinitionHost(host);
  const left = host.querySelector<HTMLElement>('[data-flow-anchor="left"]');
  const right = host.querySelector<HTMLElement>('[data-flow-anchor="right"]');
  const socket = isDef ? right : left;
  if (!socket) return restore;

  restore.push(socket);
  socket.classList.remove(ANCHOR_OFF, ANCHOR_ENDPOINT_SIBLING);
  socket.classList.add(ANCHOR_ON);
  removeAnchorColorClasses(socket);
  if (isSibling) {
    socket.classList.add(ANCHOR_ENDPOINT_SIBLING, "bg-border", "text-border");
  } else {
    socket.classList.add(...anchorColorClasses(host));
  }
  return restore;
}

function applyEndpointHost(
  host: HTMLElement,
  isSibling: boolean,
  pinnedTokenKeys: ReadonlySet<string>,
  hoveredTokenKey: string | null,
): void {
  const traceKey = traceKeyFromHost(host);
  const extra: string[] = [CHIP_ON];
  if (isSibling) {
    extra.push(CHIP_ENDPOINT_SIBLING);
  } else if (traceKey && pinnedTokenKeys.has(traceKey)) {
    extra.push(CHIP_SOURCE);
  } else if (traceKey && hoveredTokenKey === traceKey) {
    extra.push(CHIP_HOVER_PREVIEW);
  }
  const restoreAnchors = applyEndpointSockets(host, isSibling);
  track(host, extra, restoreAnchors);
}

function litLinesForMember(memberId: string): HTMLElement[] {
  const row = getByMemberId(memberId);
  if (!row) return [];
  return [...row.querySelectorAll<HTMLElement>(".code-line")];
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
    const host = chipHostForTraceKey(key);
    if (host) track(host, [CHIP_LIT]);
  }

  const processedDefIds = new Set<string>();
  const processedHosts = new Set<HTMLElement>();

  for (const key of state.endpointTokenKeys) {
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
        applyEndpointHost(litHost, isSibling, pinnedTokenKeys, hoveredTokenKey);
      }
      continue;
    }

    if (processedHosts.has(host)) continue;
    processedHosts.add(host);
    applyEndpointHost(host, false, pinnedTokenKeys, hoveredTokenKey);
  }

  for (const memberId of state.litMemberIds) {
    const row = getByMemberId(memberId);
    if (row) track(row, [MEMBER_LIT]);
  }

  for (const memberId of state.ownerLitMemberIds) {
    const row = getByMemberId(memberId);
    if (row) track(row, [MEMBER_OWNER_LIT]);
  }

  for (const memberId of state.litLineMemberIds) {
    for (const line of litLinesForMember(memberId)) {
      track(line, [LINE_LIT]);
    }
  }
}

export function clearTraceLit(): void {
  clearPrevious();
}
