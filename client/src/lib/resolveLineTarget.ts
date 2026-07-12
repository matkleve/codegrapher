import { previewLineHandle } from "@/lib/ctrlPreviewHandles";
import { fileLineFromSnippetIndex } from "@/lib/memberFileLine";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphVisibleTarget } from "@/lib/resolveVisibleTargetTypes";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildLineGraphTarget(
  token: string,
  kind: SemanticTokenKind,
  flowNodeId: string,
  memberId: string,
  members: ClassNodeData["methods"],
): GraphVisibleTarget {
  const memberItem = members.find((m) => m.id === memberId);
  const codeLines = memberItem?.code.split("\n") ?? [];
  const startLine = memberItem?.startLine ?? 1;
  let fileLine = startLine;
  for (let i = 0; i < codeLines.length; i++) {
    if (new RegExp(`\\b${escapeRegExp(token)}\\b`).test(codeLines[i]!)) {
      fileLine = fileLineFromSnippetIndex(startLine, i);
      break;
    }
  }

  return {
    mode: "graph",
    level: "line",
    flowNodeId,
    targetHandle: previewLineHandle(memberId, fileLine),
    label: String(fileLine),
    kind,
    memberId,
    lineNumber: fileLine,
  };
}
