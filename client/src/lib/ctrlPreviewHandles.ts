export function previewTargetTop(flowNodeId: string): string {
  return `preview-target-top-${flowNodeId}`;
}

export function previewMemberHandle(memberId: string): string {
  return `preview-member-${memberId}`;
}

export function previewLineHandle(memberId: string, lineNumber: number): string {
  return `preview-line-${memberId}-${lineNumber}`;
}

export const CTRL_PREVIEW_EDGE_PREFIX = "__ctrl_";

export function ctrlPreviewEdgeId(sourceFlowId: string, token: string): string {
  return `${CTRL_PREVIEW_EDGE_PREFIX}${sourceFlowId}::${token}`;
}
