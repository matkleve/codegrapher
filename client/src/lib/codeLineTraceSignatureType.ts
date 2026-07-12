import { buildLexicalGraph, type LexicalGraph } from "@/lib/lexicalGraph";
import { paramNameForSignatureType } from "@/lib/paramTypeAnchors";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { traceSigTypeEdges } from "@/lib/traceEdgesForOrigin";
import type { CodeLineTraceContext } from "@/lib/codeLineTraceContext";

function lexicalGraphFor(ctx: CodeLineTraceContext): LexicalGraph | null {
  if (ctx.lexicalGraph) return ctx.lexicalGraph;
  if (!ctx.methodCode || ctx.methodStartLine == null) return null;
  return buildLexicalGraph(ctx.symbolIndex, ctx.methodCode, ctx.methodStartLine);
}

export function signatureTypeRelativeEdges(ctx: CodeLineTraceContext): PreviewEdgeSpec[] {
  const {
    name,
    chipEl,
    kind,
    lineNumber,
    methodCode,
    methodStartLine,
    memberId,
    sourceFlowId,
    symbolIndex,
    symbols,
    graphData,
    getNode,
    hasSymbol,
  } = ctx;
  if (!methodCode || methodStartLine == null) return [];
  if (kind !== "type" && kind !== "class") return [];
  const graph = lexicalGraphFor(ctx);
  if (!graph) return [];
  const lineIdx = lineNumber - methodStartLine;
  if (lineIdx < 0) return [];
  const lineText = methodCode.split("\n")[lineIdx] ?? "";
  const paramName = paramNameForSignatureType(lineText, name);
  if (!paramName) return [];
  return traceSigTypeEdges({
    symbolName: name,
    typeKind: kind,
    sigTypeEl: chipEl,
    paramName,
    symbolIndex,
    lexicalGraph: graph,
    methodCode,
    methodStartLine,
    flowNodeId: sourceFlowId,
    memberId,
    symbols,
    graphData,
    getNode,
    hasSymbol,
    edgeIdPrefix: `sig-inline-${paramName}-${name}`,
  });
}
