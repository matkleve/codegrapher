import { getByMemberId, getByTraceKey } from "@/lib/elementRegistry";
import { makeUsageTokenKey, parseUsageTokenKey } from "@/lib/traceKeys";

function graphPane(): HTMLElement | null {
  return document.querySelector(".graph-pane");
}

export function findMemberDefLabel(
  flowNodeId: string,
  memberId: string,
  token: string,
): HTMLElement | null {
  const fromMember = getByMemberId(memberId);
  if (fromMember?.isConnected) {
    const label = fromMember.querySelector<HTMLElement>(
      `.member-row-label[data-symbol-name="${CSS.escape(token)}"]`,
    );
    if (label?.isConnected) return label;
  }

  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-flow-node-id="${CSS.escape(flowNodeId)}"] [data-member-id="${CSS.escape(memberId)}"] .member-row-label[data-symbol-name="${CSS.escape(token)}"]`,
  );
}

export function findClassDefLabel(flowNodeId: string, token: string): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-flow-node-id="${CSS.escape(flowNodeId)}"] .node-card-title[data-symbol-name="${CSS.escape(token)}"]`,
  );
}

export function cfHostForTraceKey(traceKey: string): HTMLElement | null {
  if (!traceKey.includes("::cf-")) return null;
  const fromRegistry = getByTraceKey(traceKey);
  if (fromRegistry?.isConnected) return fromRegistry;
  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}

export function firstUsageChipOnLine(
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  token: string,
): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;
  const prefix = `${flowNodeId}::${memberId}::${lineNumber}::`;
  for (const el of pane.querySelectorAll<HTMLElement>("[data-trace-key]")) {
    const key = el.dataset.traceKey;
    if (!key?.startsWith(prefix)) continue;
    const parsed = parseUsageTokenKey(key);
    if (parsed?.token === token) return el;
  }
  return null;
}

export function usageChipInGraph(
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  token: string,
): HTMLElement | null {
  const traceKey = makeUsageTokenKey(flowNodeId, memberId, lineNumber, tokenIndex, token);
  const fromRegistry = getByTraceKey(traceKey);
  if (fromRegistry) return fromRegistry;

  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}
