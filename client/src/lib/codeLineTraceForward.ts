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
  const {
    chipEl,
    kind,
    symbolIndex,
    sourceFlowId,
    memberId,
    methodCode,
    methodStartLine,
    getNode,
    edgeKey,
  } = ctx;
  const paramDefId = chipEl.dataset.localDefId;
  if (!paramDefId?.includes("::param::") || !methodCode || methodStartLine == null) return [];
  const classData = getClassNodeData(sourceFlowId, getNode);
  if (!classData) return [];

  return buildDefRelativePreviewEdges({
    originDefId: paramDefId,
    originEl: chipEl,
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
