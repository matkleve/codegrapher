import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { CodeLineTraceContext } from "@/lib/codeLineTraceContext";
import { buildLexicalGraph, walkLexicalBackward } from "@/lib/lexicalGraph";
import { findLocalDefElement } from "@/lib/localDefElements";
import { graphPane } from "@/lib/graphPaneDom";
import {
  buildParamTypeCascadeEdges,
  paramNameFromDefId,
} from "@/lib/paramTypeCascadeEdges";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { Node } from "@xyflow/react";

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

/** Sig-type provenance when a backward lexical walk reaches a param def. */
export function buildUpstreamParamTypeCascade(
  ctx: CodeLineTraceContext,
  skipParamNames: ReadonlySet<string> = new Set(),
): PreviewEdgeSpec[] {
  const {
    chipEl,
    tokenIndex,
    symbolIndex,
    sourceFlowId,
    memberId,
    lineNumber,
    methodCode,
    methodStartLine,
    getNode,
    edgeKey,
    symbols,
    graphData,
    hasSymbol,
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

  const graph =
    ctx.lexicalGraph ?? buildLexicalGraph(symbolIndex, methodCode, methodStartLine);
  const hops = walkLexicalBackward(graph, symbolIndex, {
    startLine: lineNumber,
    startTokenIndex: tokenIndex,
  });

  const paramDepth = new Map<string, { defId: string; depth: number }>();
  for (const hop of hops) {
    if (hop.to.node !== "def") continue;
    const defId = hop.to.defId;
    if (!defId.includes("::param::")) continue;
    const name = paramNameFromDefId(defId);
    if (!name || skipParamNames.has(name)) continue;
    const prev = paramDepth.get(name);
    if (!prev || hop.depth < prev.depth) {
      paramDepth.set(name, { defId, depth: hop.depth });
    }
  }

  if (paramDepth.size === 0) return [];

  const pane = graphPane();
  if (!pane) return [];

  const edges: PreviewEdgeSpec[] = [];
  for (const [paramName, { defId, depth }] of paramDepth) {
    const paramDefEl = findLocalDefElement(pane, defId);
    if (!paramDefEl) continue;
    edges.push(
      ...buildParamTypeCascadeEdges({
        paramName,
        paramDefEl,
        flowNodeId: sourceFlowId,
        memberId,
        symbols,
        graphData,
        getNode,
        hasSymbol,
        edgeIdPrefix: `${edgeKey}-up-type-${paramName}`,
        typeParamDepth: depth + 1,
      }),
    );
  }

  return edges;
}
