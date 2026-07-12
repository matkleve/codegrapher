import { previewMemberHandle, previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { findMemberDefLabel } from "@/lib/liveAnchorFinders";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphVisibleTarget } from "@/lib/resolveVisibleTargetTypes";
import { buildLineGraphTarget } from "@/lib/resolveLineTarget";

/** Shared by methods and properties — both render as member rows with the same collapse/expand levels. */
export function buildMemberGraphTarget(
  token: string,
  kind: SemanticTokenKind,
  flowNodeId: string,
  classData: ClassNodeData,
  memberId: string,
  memberLabel: string,
  sourceFlowId: string,
  members: ClassNodeData["methods"],
  expandedMemberIds: string[],
): GraphVisibleTarget {
  const definitionEl = findMemberDefLabel(flowNodeId, memberId, token);

  if (flowNodeId === sourceFlowId) {
    return {
      mode: "graph",
      level: "member",
      flowNodeId,
      targetHandle: previewMemberHandle(memberId),
      definitionEl: definitionEl ?? undefined,
      label: memberLabel,
      kind,
      memberId,
    };
  }

  const bodyExpanded = !(classData.collapsed ?? false);
  if (!bodyExpanded) {
    return {
      mode: "graph",
      level: "class",
      flowNodeId,
      targetHandle: previewTargetTop(flowNodeId),
      label: memberLabel,
      kind,
      memberId,
    };
  }

  const memberExpanded = expandedMemberIds.includes(memberId);
  if (!memberExpanded) {
    return {
      mode: "graph",
      level: "member",
      flowNodeId,
      targetHandle: previewMemberHandle(memberId),
      label: memberLabel,
      kind,
      memberId,
    };
  }

  return buildLineGraphTarget(
    token,
    kind,
    flowNodeId,
    memberId,
    members,
  );
}
