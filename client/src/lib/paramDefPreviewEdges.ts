import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { buildLocalPreviewEdges } from "@/lib/localDefLinks";
import { buildDefRelativePreviewEdges } from "@/lib/defRelativePreviewEdges";
import { buildLexicalGraph } from "@/lib/lexicalGraph";
import { paramDefForName, type MemberSymbolIndex } from "@/lib/localSymbolLinks";
import { buildParamTypeCascadeEdges } from "@/lib/paramTypeCascadeEdges";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import {
  paramUsageCount,
  traceParamDefEdges,
} from "@/lib/traceEdgesForOrigin";
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

function memberSnippet(
  classData: ClassNodeData,
  memberId: string,
): { code: string; startLine: number } | null {
  const method = classData.methods.find((m) => m.id === memberId);
  if (!method?.code) return null;
  return { code: method.code, startLine: method.startLine ?? 1 };
}

export { paramUsageCount };

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
  lexicalGraph?: ReturnType<typeof buildLexicalGraph>,
): PreviewEdgeSpec[] {
  const kind: SemanticTokenKind = "variable";
  const classData = getClassNodeData(flowNodeId, getNode);
  if (!classData) return [];

  const snippet = memberSnippet(classData, memberId);
  if (!snippet) return [];

  const graph =
    lexicalGraph ??
    buildLexicalGraph(symbolIndex, snippet.code, snippet.startLine);

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

  const relatives = buildDefRelativePreviewEdges({
    originDefId: paramDefId,
    originEl: definitionEl,
    symbolIndex,
    methodCode: snippet.code,
    methodStartLine: snippet.startLine,
    flowNodeId,
    memberId,
    classData,
    kind,
    edgeIdPrefix: `param-def-${paramName}`,
    getNode,
  });

  const local = buildLocalPreviewEdges(definitionEl, kind, `param-def-${paramName}`);
  if (local.length > 0) return [...local, ...relatives, ...typeCascade];

  return traceParamDefEdges({
    flowNodeId,
    memberId,
    symbolIndex,
    lexicalGraph: graph,
    methodCode: snippet.code,
    methodStartLine: snippet.startLine,
    symbols,
    graphData,
    getNode,
    hasSymbol,
    paramName,
    paramDefId,
    definitionEl,
    edgeIdPrefix: `param-def-${paramName}`,
  });
}
