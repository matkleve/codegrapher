import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { buildElementPreviewEdge, liveFromDefEl, liveToFromUsageEl } from "@/lib/buildPreviewEdges";
import { buildDefRelativePreviewEdges } from "@/lib/defRelativePreviewEdges";
import { getByTraceKey } from "@/lib/elementRegistry";
import { findLocalDefElement } from "@/lib/localDefElements";
import type { LexicalGraph } from "@/lib/lexicalGraph";
import {
  buildParamTypeCascadeEdges,
  paramNameFromDefId,
} from "@/lib/paramTypeCascadeEdges";
import { findParamDefCoLocated } from "@/lib/paramTypeAnchors";
import { graphPane } from "@/lib/graphPaneDom";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import {
  bindingInitFor,
  paramDefForName,
  type MemberSymbolIndex,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { lineTokens } from "@/lib/lexicalWalkCore";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { previewHopFromDepth } from "@/lib/traceDepth";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import type { GraphData, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

export type TraceMemberContext = {
  flowNodeId: string;
  memberId: string;
  symbolIndex: MemberSymbolIndex;
  lexicalGraph: LexicalGraph;
  methodCode: string;
  methodStartLine: number;
  symbols: Map<string, SymbolEntry[]>;
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  hasSymbol: (name: string) => boolean;
};

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

function resolveParamTargetFromInitSite(
  symbolIndex: MemberSymbolIndex,
  methodCode: string,
  methodStartLine: number,
  site: { lineNumber: number; tokenIndex: number },
): { defId: string; direct: boolean } | null {
  const direct = usageTargetFor(symbolIndex, site.lineNumber, site.tokenIndex);
  if (direct?.includes("::param::")) return { defId: direct, direct: true };

  const tokens = lineTokens(methodCode, methodStartLine, site.lineNumber);
  for (const receiverIdx of memberAccessReceiverIndices(tokens, site.tokenIndex)) {
    const viaReceiver = usageTargetFor(symbolIndex, site.lineNumber, receiverIdx);
    if (viaReceiver?.includes("::param::")) {
      return { defId: viaReceiver, direct: false };
    }
  }
  return null;
}

export function paramUsageCount(graph: LexicalGraph, paramDefId: string): number {
  return graph.usagesOfDef.get(paramDefId)?.length ?? 0;
}

export type SigTypeTraceContext = TraceMemberContext & {
  symbolName: string;
  typeKind: SemanticTokenKind;
  sigTypeEl: HTMLElement;
  paramName: string;
  edgeIdPrefix: string;
};

/** Sig-type → param typesetting + chained lexical relatives from the param def. */
export function traceSigTypeEdges(ctx: SigTypeTraceContext): PreviewEdgeSpec[] {
  const paramDef = paramDefForName(ctx.symbolIndex, ctx.memberId, ctx.paramName);
  if (!paramDef) return [];

  const classData = getClassNodeData(ctx.flowNodeId, ctx.getNode);
  if (!classData) return [];

  const paramDefEl = findParamDefCoLocated(
    ctx.flowNodeId,
    ctx.memberId,
    ctx.paramName,
    ctx.sigTypeEl,
    paramDef.defId,
  );
  const paramAnchor =
    paramDefEl?.isConnected
      ? paramDefEl
      : (() => {
          const stub = document.createElement("span");
          stub.dataset.localDefId = paramDef.defId;
          stub.dataset.symbolName = ctx.paramName;
          stub.dataset.symbolRole = "definition";
          return stub;
        })();

  const paramTo =
    paramDefEl?.isConnected
      ? ({ type: "element" as const, el: paramDefEl })
      : resolveUsageSiteAnchor(
          ctx.flowNodeId,
          classData,
          ctx.memberId,
          paramDef.lineNumber,
          0,
          ctx.paramName,
        );

  const edges: PreviewEdgeSpec[] = [
    {
      id: `${ctx.edgeIdPrefix}-sig-param`,
      from: { type: "element", el: ctx.sigTypeEl },
      to: paramTo,
      kind: ctx.typeKind,
      connectionKind: "typesetting",
      hop: previewHopFromDepth(2),
      liveFrom:
        liveToFromUsageEl(ctx.symbolName, ctx.sigTypeEl) ?? {
          token: ctx.symbolName,
          flowNodeId: ctx.flowNodeId,
          memberId: ctx.memberId,
          role: "usage",
          traceKey: ctx.sigTypeEl.dataset.traceKey,
        },
      liveTo: paramDefEl?.isConnected
        ? liveFromDefEl(ctx.paramName, paramDefEl, ctx.flowNodeId, ctx.memberId)
        : {
            token: ctx.paramName,
            flowNodeId: ctx.flowNodeId,
            memberId: ctx.memberId,
            lineNumber: paramDef.lineNumber,
            role: "definition",
          },
    },
  ];

  edges.push(
    ...buildDefRelativePreviewEdges({
      originDefId: paramDef.defId,
      originEl: paramAnchor,
      symbolIndex: ctx.symbolIndex,
      methodCode: ctx.methodCode,
      methodStartLine: ctx.methodStartLine,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      classData,
      kind: "variable",
      edgeIdPrefix: `${ctx.edgeIdPrefix}-rel`,
      includeDirectUsages: true,
      depthOffset: 2,
      getNode: ctx.getNode,
    }),
  );

  return edges;
}

function findInitChip(
  pane: HTMLElement,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  token: string,
): HTMLElement | null {
  const traceKey = makeUsageTokenKey(flowNodeId, memberId, lineNumber, tokenIndex, token);
  const registered = getByTraceKey(traceKey);
  if (registered?.isConnected) return registered;
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}

export type BindingInitCascadeContext = TraceMemberContext & {
  bindingDefEl: HTMLElement;
  edgeIdPrefix: string;
};

/**
 * When a binding initializer is a direct param reference, extend the trace to
 * the param def and its sig-type chain.
 */
export function traceBindingInitCascadeEdges(
  ctx: BindingInitCascadeContext,
): PreviewEdgeSpec[] {
  const defId = ctx.bindingDefEl.dataset.localDefId;
  if (!defId) return [];

  const site = bindingInitFor(ctx.symbolIndex, defId);
  if (!site) return [];

  const paramTarget = resolveParamTargetFromInitSite(
    ctx.symbolIndex,
    ctx.methodCode,
    ctx.methodStartLine,
    site,
  );
  if (!paramTarget) return [];

  const pane = graphPane();
  if (!pane) return [];

  const initEl = findInitChip(
    pane,
    ctx.flowNodeId,
    ctx.memberId,
    site.lineNumber,
    site.tokenIndex,
    site.token,
  );
  const paramDefEl = findLocalDefElement(pane, paramTarget.defId);
  if (!initEl || !paramDefEl) return [];

  const edges: PreviewEdgeSpec[] = [
    {
      ...buildElementPreviewEdge(
        `${ctx.edgeIdPrefix}-init-param`,
        paramDefEl,
        initEl,
        "variable",
      ),
      hop: previewHopFromDepth(2),
    },
  ];

  const paramName = paramNameFromDefId(paramTarget.defId);
  if (!paramName || !paramTarget.direct) return edges;

  const typeEdges = buildParamTypeCascadeEdges({
    paramName,
    paramDefEl,
    flowNodeId: ctx.flowNodeId,
    memberId: ctx.memberId,
    symbols: ctx.symbols,
    graphData: ctx.graphData,
    getNode: ctx.getNode,
    hasSymbol: ctx.hasSymbol,
    edgeIdPrefix: `${ctx.edgeIdPrefix}-init-type-${paramName}`,
    typeParamDepth: 3,
  });

  for (const edge of typeEdges) {
    edges.push(edge);
  }

  return edges;
}

export type ParamDefTraceContext = TraceMemberContext & {
  paramName: string;
  paramDefId: string;
  definitionEl: HTMLElement;
  edgeIdPrefix: string;
};

/** Param definition hover → usages, relatives, and type provenance. */
export function traceParamDefEdges(ctx: ParamDefTraceContext): PreviewEdgeSpec[] {
  const kind: SemanticTokenKind = "variable";
  const classData = getClassNodeData(ctx.flowNodeId, ctx.getNode);
  if (!classData) return [];

  const typeCascade = buildParamTypeCascadeEdges({
    paramName: ctx.paramName,
    paramDefEl: ctx.definitionEl,
    flowNodeId: ctx.flowNodeId,
    memberId: ctx.memberId,
    symbols: ctx.symbols,
    graphData: ctx.graphData,
    getNode: ctx.getNode,
    hasSymbol: ctx.hasSymbol,
    edgeIdPrefix: ctx.edgeIdPrefix,
  });

  const relatives = buildDefRelativePreviewEdges({
    originDefId: ctx.paramDefId,
    originEl: ctx.definitionEl,
    symbolIndex: ctx.symbolIndex,
    methodCode: ctx.methodCode,
    methodStartLine: ctx.methodStartLine,
    flowNodeId: ctx.flowNodeId,
    memberId: ctx.memberId,
    classData,
    kind,
    edgeIdPrefix: `param-def-${ctx.paramName}`,
    getNode: ctx.getNode,
  });

  const usageSites = ctx.lexicalGraph.usagesOfDef.get(ctx.paramDefId) ?? [];
  const usageEdges: PreviewEdgeSpec[] = usageSites.map((site, idx) => ({
    id: `${ctx.edgeIdPrefix}-${idx}`,
    from: { type: "element", el: ctx.definitionEl },
    to: resolveUsageSiteAnchor(
      ctx.flowNodeId,
      classData,
      ctx.memberId,
      site.lineNumber,
      site.tokenIndex,
      ctx.paramName,
    ),
    kind,
    liveFrom: {
      token: ctx.paramName,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: paramDefForName(ctx.symbolIndex, ctx.memberId, ctx.paramName)?.lineNumber,
      role: "definition",
      traceKey: ctx.definitionEl.dataset.traceKey,
    },
    liveTo: {
      token: ctx.paramName,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: site.lineNumber,
      tokenIndex: site.tokenIndex,
      role: "usage",
    },
  }));

  return [...usageEdges, ...relatives, ...typeCascade];
}
