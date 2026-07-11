import {
  controlFlowAnchorFor,
  controlFlowGroup,
  type ControlFlowGroup,
  type ControlFlowIndex,
} from "@/lib/controlFlowLinks";
import { liveToFromUsageEl } from "@/lib/buildPreviewEdges";
import type { LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { makeControlFlowKey, makeUsageTokenKey, parseControlFlowKey } from "@/lib/traceKeys";
import { graphPane } from "@/lib/graphPaneDom";

function cfElAt(
  pane: ParentNode,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
): HTMLElement | null {
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(makeControlFlowKey(flowNodeId, memberId, lineNumber, tokenIndex))}"]`,
  );
}

function usageElAt(
  pane: ParentNode,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  token: string,
): HTMLElement | null {
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(makeUsageTokenKey(flowNodeId, memberId, lineNumber, tokenIndex, token))}"]`,
  );
}

function liveHintFromEl(
  el: HTMLElement,
  role: LiveAnchorHint["role"],
): LiveAnchorHint | undefined {
  const usage = liveToFromUsageEl(el.dataset.symbolName ?? "", el);
  if (usage) return { ...usage, role };
  const traceKey = el.dataset.traceKey;
  if (!traceKey) return undefined;
  const parsedCf = parseControlFlowKey(traceKey);
  if (!parsedCf) return undefined;
  return {
    token: el.textContent?.trim() ?? "",
    flowNodeId: parsedCf.flowNodeId,
    memberId: parsedCf.memberId,
    lineNumber: parsedCf.lineNumber,
    role,
    traceKey,
  };
}

/** Prefer the switch/if discriminant chip over the keyword for branch back-wires. */
function branchSourceEl(
  pane: ParentNode,
  index: ControlFlowIndex,
  group: ControlFlowGroup,
  flowNodeId: string,
  memberId: string,
): HTMLElement | null {
  for (const [key, anchor] of index.anchors) {
    if (anchor.groupId !== group.id || anchor.role !== "condition" || !anchor.token) {
      continue;
    }
    const lineNumber = Number(key.split(":")[0]);
    const tokenIndex = Number(key.split(":")[1]);
    if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) continue;
    const el = usageElAt(pane, flowNodeId, memberId, lineNumber, tokenIndex, anchor.token);
    if (el?.isConnected) return el;
  }
  return cfElAt(pane, flowNodeId, memberId, group.headLine, group.headTokenIndex);
}

function makeBranchEdge(
  edgeId: string,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  fromRole: LiveAnchorHint["role"],
  toRole: LiveAnchorHint["role"],
): PreviewEdgeSpec {
  return {
    id: edgeId,
    from: { type: "element", el: fromEl },
    to: { type: "element", el: toEl },
    kind: "variable",
    connectionKind: "branch",
    liveFrom: liveHintFromEl(fromEl, fromRole),
    liveTo: liveHintFromEl(toEl, toRole),
  };
}

/**
 * Control-flow fan-out: hovering the `switch`/`if` keyword or its
 * discriminant/condition identifier wires to every case/else branch; hovering
 * one branch (`case`/`else`) wires back to the condition (or keyword) only.
 */
export function buildControlFlowPreviewEdges(
  host: HTMLElement,
  controlFlowIndex: ControlFlowIndex,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  edgeIdPrefix: string,
): PreviewEdgeSpec[] {
  const pane = graphPane();
  if (!pane) return [];

  const anchor = controlFlowAnchorFor(controlFlowIndex, lineNumber, tokenIndex);
  if (!anchor) return [];

  const group = controlFlowGroup(controlFlowIndex, anchor.groupId);
  if (!group) return [];

  if (anchor.role === "branch") {
    const fromEl = branchSourceEl(pane, controlFlowIndex, group, flowNodeId, memberId);
    if (!fromEl || fromEl === host) return [];
    const fromRole: LiveAnchorHint["role"] =
      fromEl.dataset.localTargetId != null ? "usage" : "definition";
    return [makeBranchEdge(`${edgeIdPrefix}-branch`, fromEl, host, fromRole, "usage")];
  }

  const fromEl =
    anchor.role === "condition" && anchor.token
      ? usageElAt(pane, flowNodeId, memberId, lineNumber, tokenIndex, anchor.token) ?? host
      : host;

  const edges: PreviewEdgeSpec[] = [];
  for (const branch of group.branches) {
    const branchEl = cfElAt(pane, flowNodeId, memberId, branch.lineNumber, branch.tokenIndex);
    if (!branchEl || branchEl === fromEl) continue;
    edges.push(
      makeBranchEdge(
        `${edgeIdPrefix}-branch-${branch.lineNumber}-${branch.tokenIndex}`,
        fromEl,
        branchEl,
        anchor.role === "condition" ? "usage" : "definition",
        "usage",
      ),
    );
  }
  return edges;
}
