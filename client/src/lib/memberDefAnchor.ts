import { getByMemberId } from "@/lib/elementRegistry";
import { memberIdFromDefKey } from "@/lib/traceKeys";

/** Active trace host + body-vs-title preference for member definition endpoints. */
export const traceAnchorState = {
  activeHost: null as HTMLElement | null,
  /** When true, prefer the signature-line chip over the row title when both exist. */
  preferBody: true,
};

let anchorPreferenceLocked = false;

export function lockTraceAnchorPreference(): void {
  anchorPreferenceLocked = true;
}

export function unlockTraceAnchorPreference(): void {
  anchorPreferenceLocked = false;
  traceAnchorState.preferBody = true;
}

export function isTraceAnchorPreferenceLocked(): boolean {
  return anchorPreferenceLocked;
}

export function setTraceAnchorHost(host: HTMLElement | null): void {
  traceAnchorState.activeHost = host;
  if (!host) return;
  if (host.classList.contains("member-row-label")) {
    traceAnchorState.preferBody = false;
  } else if (host.closest(".code-line") || host.closest(".member-body-wrap")) {
    traceAnchorState.preferBody = true;
  }
}

export function clearTraceAnchorHost(): void {
  traceAnchorState.activeHost = null;
  if (!anchorPreferenceLocked) {
    traceAnchorState.preferBody = true;
  }
}

function memberRowForMemberId(memberId: string): HTMLElement | null {
  const fromRegistry = getByMemberId(memberId);
  if (fromRegistry) return fromRegistry;

  const pane = document.querySelector(".graph-pane");
  const row = pane?.querySelector<HTMLElement>(
    `[data-member-id="${CSS.escape(memberId)}"]`,
  );
  return row?.isConnected ? row : null;
}

/** Member-row title + signature-line body chip sharing one member def trace key. */
export function memberDefSiblingHosts(key: string): HTMLElement[] | null {
  const memberId = memberIdFromDefKey(key);
  if (!memberId) return null;

  const row = memberRowForMemberId(memberId);
  if (!row) return null;

  const esc = CSS.escape(key);
  const hosts: HTMLElement[] = [];
  const label = row.querySelector<HTMLElement>(
    `.member-row-label[data-trace-key="${esc}"]`,
  );
  if (label) hosts.push(label);
  for (const chip of row.querySelectorAll<HTMLElement>(
    `.code-line [data-trace-key="${esc}"]`,
  )) {
    hosts.push(chip);
  }
  return hosts.length > 0 ? hosts : null;
}

function bodyChipInGroup(hosts: HTMLElement[]): HTMLElement | null {
  return (
    hosts.find(
      (host) =>
        !host.classList.contains("member-row-label") &&
        Boolean(host.closest(".member-body-wrap")),
    ) ?? null
  );
}

/**
 * Resolve the live DOM endpoint for a member definition trace key.
 * Honors the hovered/pinned host; falls back to title when body is collapsed.
 */
export function resolveMemberDefEndpoint(key: string): HTMLElement | null {
  const siblings = memberDefSiblingHosts(key);
  if (!siblings?.length) return null;

  const { activeHost, preferBody } = traceAnchorState;
  if (activeHost?.isConnected && siblings.includes(activeHost)) {
    return activeHost;
  }

  const body = bodyChipInGroup(siblings);
  if (preferBody && body?.isConnected) return body;

  const label = siblings.find((host) => host.classList.contains("member-row-label"));
  if (label?.isConnected) return label;

  return siblings.find((host) => host.isConnected) ?? null;
}

/** Row title + signature-line chip are one definition — lit together, never wired. */
export function areMemberDefSiblingHosts(a: HTMLElement, b: HTMLElement): boolean {
  const memberIds = new Set<string>();

  for (const el of [a, b]) {
    const defId = el.dataset.localDefId ?? el.dataset.localTargetId;
    if (defId?.startsWith("local-def::member::")) {
      memberIds.add(defId.slice("local-def::member::".length));
    }
    const mid = el.dataset.traceKey ? memberIdFromDefKey(el.dataset.traceKey) : null;
    if (mid) memberIds.add(mid);
  }

  if (memberIds.size !== 1) return false;
  const memberId = [...memberIds][0]!;
  return [a, b].every(
    (el) =>
      el.closest<HTMLElement>(`[data-member-id="${CSS.escape(memberId)}"]`) != null,
  );
}
