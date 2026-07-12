import { buildDefRelativePreviewEdges } from "@/lib/defRelativePreviewEdges";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";
import type { CodeLineTraceContext } from "@/lib/codeLineTraceContext";

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

export function forwardLexicalRelativesForParamDef(
  ctx: CodeLineTraceContext,
): PreviewEdgeSpec[] {
  const paramDefId = ctx.chipEl.dataset.localDefId;
  if (!paramDefId?.includes("::param::") || !ctx.methodCode || ctx.methodStartLine == null) {
    return [];
  }
  return forwardLexicalRelativesForDef(ctx, paramDefId, ctx.chipEl);
}

/** Chained downstream relatives from a local binding def (initializer hover or binding LHS). */
export function forwardLexicalRelativesForBindingDef(
  ctx: CodeLineTraceContext,
  bindingDefId: string,
  originEl: HTMLElement,
): PreviewEdgeSpec[] {
  if (!bindingDefId.includes("::local::") || !ctx.methodCode || ctx.methodStartLine == null) {
    return [];
  }
  return forwardLexicalRelativesForDef(ctx, bindingDefId, originEl);
}

function forwardLexicalRelativesForDef(
  ctx: CodeLineTraceContext,
  originDefId: string,
  originEl: HTMLElement,
): PreviewEdgeSpec[] {
  const {
    kind,
    symbolIndex,
    sourceFlowId,
    memberId,
    methodCode,
    methodStartLine,
    getNode,
    edgeKey,
  } = ctx;
  const classData = getClassNodeData(sourceFlowId, getNode);
  if (!classData || !methodCode || methodStartLine == null) return [];

  return buildDefRelativePreviewEdges({
    originDefId,
    originEl,
    symbolIndex,
    methodCode,
    methodStartLine,
    flowNodeId: sourceFlowId,
    memberId,
    classData,
    kind,
    edgeIdPrefix: edgeKey,
    getNode,
  });
}
