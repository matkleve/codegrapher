import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { buildLocalPreviewEdges } from "@/lib/localDefLinks";
import {
  paramDefForName,
  type MemberSymbolIndex,
} from "@/lib/localSymbolLinks";
import { buildParamTypeCascadeEdges } from "@/lib/paramTypeCascadeEdges";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphData, SymbolEntry } from "@/types";
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
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  hasSymbol: (name: string) => boolean,
): PreviewEdgeSpec[] {
  const kind: SemanticTokenKind = "variable";
  const typeCascade = buildParamTypeCascadeEdges({
    paramName,
    paramDefEl: definitionEl,
    flowNodeId,
    memberId,
    symbols,
    graphData,
    getNode,
    hasSymbol,
    edgeIdPrefix: `param-def-${paramName}`,
  });

  const local = buildLocalPreviewEdges(definitionEl, kind, `param-def-${paramName}`);
  if (local.length > 0) return [...local, ...typeCascade];

  const classData = getClassNodeData(flowNodeId, getNode);
  if (!classData) return [];

  const edges: PreviewEdgeSpec[] = [];
  let idx = 0;
  for (const [key, targetId] of symbolIndex.usageTargets) {
    if (targetId !== paramDefId) continue;
    const lineNumber = Number(key.split(":")[0]);
    const tokenIndex = Number(key.split(":")[1]);
    if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex) || lineNumber < 1) {
      continue;
    }

    edges.push({
      id: `param-def-${paramName}-${idx}`,
      from: { type: "element", el: definitionEl },
      to: resolveUsageSiteAnchor(
        flowNodeId,
        classData,
        memberId,
        lineNumber,
        tokenIndex,
        paramName,
      ),
      kind,
      liveFrom: {
        token: paramName,
        flowNodeId,
        memberId,
        lineNumber: paramDefForName(symbolIndex, memberId, paramName)?.lineNumber,
        role: "definition",
        traceKey: definitionEl.dataset.traceKey,
      },
      liveTo: {
        token: paramName,
        flowNodeId,
        memberId,
        lineNumber,
        tokenIndex,
        role: "usage",
      },
    });
    idx++;
  }
  return [...edges, ...typeCascade];
}
