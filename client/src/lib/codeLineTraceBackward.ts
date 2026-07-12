import { buildBackwardLexicalRelatives } from "@/lib/defRelativePreviewEdges";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { tokenizeLine } from "@/lib/tokenizeLine";
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

export function backwardLexicalEdges(ctx: CodeLineTraceContext): PreviewEdgeSpec[] {
  const {
    chipEl,
    kind,
    tokenIndex,
    symbolIndex,
    sourceFlowId,
    memberId,
    lineNumber,
    methodCode,
    methodStartLine,
    getNode,
    edgeKey,
  } = ctx;
  if (!methodCode || methodStartLine == null || !Number.isFinite(tokenIndex)) return [];
  const classData = getClassNodeData(sourceFlowId, getNode);
  if (!classData) return [];

  const lineText = methodCode.split("\n")[lineNumber - methodStartLine] ?? "";
  const tokens = tokenizeLine(lineText).tokens;
  let dotIdx = tokenIndex - 1;
  while (dotIdx >= 0 && tokens[dotIdx]?.kind === "whitespace") dotIdx--;
  const isMemberProp = dotIdx >= 0 && tokens[dotIdx]?.text === ".";

  if (!isMemberProp && !chipEl.dataset.localTargetId) return [];

  return buildBackwardLexicalRelatives({
    originEl: chipEl,
    symbolIndex,
    methodCode,
    methodStartLine,
    flowNodeId: sourceFlowId,
    memberId,
    classData,
    kind,
    edgeIdPrefix: edgeKey,
    startLine: lineNumber,
    startTokenIndex: tokenIndex,
  });
}
