export const PREVIEW_TARGET_TOP = "preview-target-top";

export function previewMemberHandle(memberId: string): string {
  return `preview-member-${memberId}`;
}

export function previewLineHandle(memberId: string, lineNumber: number): string {
  return `preview-line-${memberId}-${lineNumber}`;
}

export function previewSourceHandle(memberId: string, lineNumber: number): string {
  return `preview-source-${memberId}-${lineNumber}`;
}

export const CTRL_PREVIEW_EDGE_PREFIX = "__ctrl_";

export function ctrlPreviewEdgeId(sourceFlowId: string, token: string): string {
  return `${CTRL_PREVIEW_EDGE_PREFIX}${sourceFlowId}::${token}`;
}
