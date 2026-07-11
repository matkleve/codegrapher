import type { TraceLitState } from "@/lib/computeTraceLit";
import { allLocalDefElements } from "@/lib/localDefElements";
import { getByMemberId, getByTraceKey } from "@/lib/elementRegistry";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";

const CHIP_LIT = "token-chip-lit";
const CHIP_ON = "token-chip-on";
const CHIP_SOURCE = "token-chip-source";
const CHIP_HOVER_PREVIEW = "token-chip-hover-preview";
const MEMBER_LIT = "trace-member-lit";
const MEMBER_OWNER_LIT = "trace-member-owner-lit";
const LINE_LIT = "trace-lit-line";
const ANCHOR_ON = "flow-anchor-on";
const ANCHOR_OFF = "flow-anchor-off";

type Applied = {
  el: HTMLElement;
  classes: string[];
  restoreAnchorOff?: HTMLElement[];
};

let previous: Applied[] = [];

function chipHostForTraceKey(key: string): HTMLElement | null {
  return getByTraceKey(key);
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
        anchor.classList.remove(ANCHOR_ON);
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

function applyEndpointSockets(host: HTMLElement): HTMLElement[] {
  const restore: HTMLElement[] = [];
  const isDef = isDefinitionHost(host);
  const left = host.querySelector<HTMLElement>('[data-flow-anchor="left"]');
  const right = host.querySelector<HTMLElement>('[data-flow-anchor="right"]');
  const socket = isDef ? right : left;
  if (!socket) return restore;

  restore.push(socket);
  socket.classList.remove(ANCHOR_OFF);
  socket.classList.add(ANCHOR_ON, ...anchorColorClasses(host));
  return restore;
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

  for (const key of state.endpointTokenKeys) {
    const host = chipHostForTraceKey(key);
    if (!host) continue;
    const extra: string[] = [CHIP_ON];
    if (pinnedTokenKeys.has(key)) {
      extra.push(CHIP_SOURCE);
    } else if (hoveredTokenKey === key) {
      extra.push(CHIP_HOVER_PREVIEW);
    }
    for (const litHost of litHostsForEndpoint(host)) {
      const restoreAnchors = applyEndpointSockets(litHost);
      track(litHost, extra, restoreAnchors);
    }
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
