import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { buildLocalPreviewEdges } from "@/lib/localDefLinks";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { Node } from "@xyflow/react";

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

export function paramUsageCount(
  symbolIndex: MemberSymbolIndex,
  paramDefId: string,
): number {
  let count = 0;
  for (const targetId of symbolIndex.usageTargets.values()) {
    if (targetId === paramDefId) count++;
  }
  return count;
}

/** Param definition in header or signature line → in-body usages (DOM or member-scoped index). */
export function buildParamDefPreviewEdges(
  paramName: string,
  paramDefId: string,
  definitionEl: HTMLElement,
  symbolIndex: MemberSymbolIndex,
  flowNodeId: string,
  memberId: string,
  getNode: (id: string) => Node | undefined,
): PreviewEdgeSpec[] {
  const kind: SemanticTokenKind = "variable";
  const local = buildLocalPreviewEdges(definitionEl, kind, `param-def-${paramName}`);
  if (local.length > 0) return local;

  const classData = getClassNodeData(flowNodeId, getNode);
  if (!classData) return [];

  const edges: PreviewEdgeSpec[] = [];
  let idx = 0;
  for (const [key, targetId] of symbolIndex.usageTargets) {
    if (targetId !== paramDefId) continue;
    const lineNumber = Number(key.split(":")[0]);
    if (!Number.isFinite(lineNumber) || lineNumber < 1) continue;

    edges.push({
      id: `param-def-${paramName}-${idx}`,
      from: { type: "element", el: definitionEl },
      to: resolveUsageSiteAnchor(
        flowNodeId,
        classData,
        memberId,
        lineNumber,
        paramName,
      ),
      kind,
      liveTo: {
        token: paramName,
        flowNodeId,
        memberId,
        lineNumber,
        role: "usage",
      },
    });
    idx++;
  }
  return edges;
}
