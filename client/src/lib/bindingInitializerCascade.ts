import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { getByTraceKey } from "@/lib/elementRegistry";
import { findLocalDefElement } from "@/lib/localDefElements";
import {
  bindingInitFor,
  type MemberSymbolIndex,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import {
  buildParamTypeCascadeEdges,
  paramNameFromDefId,
} from "@/lib/paramTypeCascadeEdges";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { graphPane } from "@/lib/graphPaneDom";
import type { GraphData, SymbolEntry } from "@/types";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import type { Node } from "@xyflow/react";

export type BindingInitializerCascadeContext = {
  bindingDefEl: HTMLElement;
  symbolIndex: MemberSymbolIndex;
  flowNodeId: string;
  memberId: string;
  methodCode: string;
  methodStartLine: number;
  edgeIdPrefix: string;
  symbols: Map<string, SymbolEntry[]>;
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  hasSymbol: (name: string) => boolean;
};

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

/**
 * When a binding initializer is a direct param reference (`for…of results`,
 * `const x = param`), extend the trace to the param def and its sig-type chain.
 *
 * Does **not** walk member-access receivers (`const addr = result.address`) —
 * those only light on explicit hover of each token in the chain.
 */
export function buildBindingInitializerCascadeEdges(
  ctx: BindingInitializerCascadeContext,
): PreviewEdgeSpec[] {
  const defId = ctx.bindingDefEl.dataset.localDefId;
  if (!defId) return [];

  const site = bindingInitFor(ctx.symbolIndex, defId);
  if (!site) return [];

  const paramTargetId = usageTargetFor(
    ctx.symbolIndex,
    site.lineNumber,
    site.tokenIndex,
  );
  if (!paramTargetId?.includes("::param::")) return [];

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
  const paramDefEl = findLocalDefElement(pane, paramTargetId);
  if (!initEl || !paramDefEl) return [];

  const edges: PreviewEdgeSpec[] = [
    {
      ...buildElementPreviewEdge(
        `${ctx.edgeIdPrefix}-init-param`,
        paramDefEl,
        initEl,
        "variable",
      ),
      hop: 3,
    },
  ];

  const paramName = paramNameFromDefId(paramTargetId);
  if (!paramName) return edges;

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
  });

  for (const edge of typeEdges) {
    edges.push({
      ...edge,
      hop: edge.hop === 2 ? 3 : edge.hop,
    });
  }

  return edges;
}
