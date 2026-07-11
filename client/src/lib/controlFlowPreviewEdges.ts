import {
  controlFlowAnchorFor,
  controlFlowGroup,
  type ControlFlowIndex,
} from "@/lib/controlFlowLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { makeControlFlowKey } from "@/lib/traceKeys";
import { graphPane } from "@/lib/graphPaneDom";

/**
 * Control-flow fan-out: hovering the `switch`/`if` keyword or its
 * discriminant/condition identifier wires to every case/else branch; hovering
 * one branch (`case`/`else`) wires back to the head only. See
 * connection-taxonomy.md § Control flow.
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

  const elAt = (line: number, idx: number): HTMLElement | null =>
    pane.querySelector<HTMLElement>(
      `[data-trace-key="${CSS.escape(makeControlFlowKey(flowNodeId, memberId, line, idx))}"]`,
    );

  if (anchor.role === "branch") {
    const headEl = elAt(group.headLine, group.headTokenIndex);
    if (!headEl || headEl === host) return [];
    return [
      {
        id: `${edgeIdPrefix}-branch`,
        from: { type: "element", el: headEl },
        to: { type: "element", el: host },
        kind: "variable",
        connectionKind: "branch",
      },
    ];
  }

  const edges: PreviewEdgeSpec[] = [];
  for (const branch of group.branches) {
    const branchEl = elAt(branch.lineNumber, branch.tokenIndex);
    if (!branchEl || branchEl === host) continue;
    edges.push({
      id: `${edgeIdPrefix}-branch-${branch.lineNumber}-${branch.tokenIndex}`,
      from: { type: "element", el: host },
      to: { type: "element", el: branchEl },
      kind: "variable",
      connectionKind: "branch",
    });
  }
  return edges;
}
