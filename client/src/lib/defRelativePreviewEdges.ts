import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import {
  BACKWARD_LEXICAL_MAX_DEPTH,
  buildLexicalGraph,
  RELATIVE_FAN_OUT_CAP,
  RELATIVE_MAX_DEPTH,
  TRACE_DEPTH_DOWN,
  TRACE_DEPTH_UP,
  TRACE_VISUAL_HOP_MAX,
  walkLexicalBackward,
  walkLexicalForward,
} from "@/lib/lexicalGraph";
import { lexicalWalkToPreviewEdges } from "@/lib/lexicalWalkPreviewEdges";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { Node } from "@xyflow/react";

export {
  BACKWARD_LEXICAL_MAX_DEPTH,
  RELATIVE_FAN_OUT_CAP,
  RELATIVE_MAX_DEPTH,
  TRACE_DEPTH_DOWN,
  TRACE_DEPTH_UP,
  TRACE_VISUAL_HOP_MAX,
};

type RelativeWalkContext = {
  originDefId: string;
  originEl: HTMLElement;
  originToken?: string;
  symbolIndex: MemberSymbolIndex;
  methodCode: string;
  methodStartLine: number;
  flowNodeId: string;
  memberId: string;
  classData: ClassNodeData;
  kind: SemanticTokenKind;
  edgeIdPrefix: string;
  maxDepth?: number;
  maxEdges?: number;
  hopOffset?: number;
  includeDirectUsages?: boolean;
  preferOriginEl?: boolean;
  getNode?: (id: string) => Node | undefined;
};

type BackwardWalkContext = {
  originEl: HTMLElement;
  symbolIndex: MemberSymbolIndex;
  methodCode: string;
  methodStartLine: number;
  flowNodeId: string;
  memberId: string;
  classData: ClassNodeData;
  kind: SemanticTokenKind;
  edgeIdPrefix: string;
  startLine: number;
  startTokenIndex: number;
  maxDepth?: number;
  getNode?: (id: string) => Node | undefined;
};

const noopGetNode = (): undefined => undefined;

/**
 * Walk outward from a param/local def with **chained** wires
 * (each hop connects the previous token to the next — not a flat fan from origin).
 */
export function buildDefRelativePreviewEdges(ctx: RelativeWalkContext): PreviewEdgeSpec[] {
  const graph = buildLexicalGraph(ctx.symbolIndex, ctx.methodCode, ctx.methodStartLine);
  const hops = walkLexicalForward(graph, ctx.originDefId, {
    maxDepth: ctx.maxDepth,
    maxEdges: ctx.maxEdges,
    includeDirectUsages: ctx.includeDirectUsages,
  });

  return lexicalWalkToPreviewEdges(hops, {
    originEl: ctx.originEl,
    originDefId: ctx.originDefId,
    flowNodeId: ctx.flowNodeId,
    memberId: ctx.memberId,
    classData: ctx.classData,
    graph,
    kind: ctx.kind,
    edgeIdPrefix: ctx.edgeIdPrefix,
    hopOffset: ctx.hopOffset,
    getNode: ctx.getNode ?? noopGetNode,
  });
}

/**
 * Walk **upstream** from a body usage or member-access property through the
 * symbol index: `.city` ← `addr` ← `result.address` ← `result` param.
 */
export function buildBackwardLexicalRelatives(ctx: BackwardWalkContext): PreviewEdgeSpec[] {
  const graph = buildLexicalGraph(ctx.symbolIndex, ctx.methodCode, ctx.methodStartLine);
  const hops = walkLexicalBackward(graph, ctx.symbolIndex, {
    maxDepth: ctx.maxDepth,
    startLine: ctx.startLine,
    startTokenIndex: ctx.startTokenIndex,
  });

  return lexicalWalkToPreviewEdges(
    hops,
    {
      originEl: ctx.originEl,
      originToken: ctx.originEl.dataset.symbolName ?? "",
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      classData: ctx.classData,
      graph,
      kind: ctx.kind,
      edgeIdPrefix: ctx.edgeIdPrefix,
      hopOffset: 1,
      getNode: ctx.getNode ?? noopGetNode,
    },
    "backward",
  );
}
