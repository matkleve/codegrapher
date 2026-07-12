import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { getByTraceKey } from "@/lib/elementRegistry";
import { findLocalDefElement } from "@/lib/localDefElements";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
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
import { tokenizeLine } from "@/lib/tokenizeLine";
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

function snippetLine(
  methodCode: string,
  fileLine: number,
  methodStartLine: number,
): string | null {
  const idx = fileLine - methodStartLine;
  const lines = methodCode.split("\n");
  if (idx < 0 || idx >= lines.length) return null;
  return lines[idx] ?? null;
}

function findReceiverChip(
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
 * When a binding reads through a receiver (`const addr = result.address`), walk
 * left from the binding init anchor and wire each lexical receiver (e.g. `result`)
 * back to its param/local def at hop 3.
 */
export function buildBindingInitializerCascadeEdges(
  ctx: BindingInitializerCascadeContext,
): PreviewEdgeSpec[] {
  const defId = ctx.bindingDefEl.dataset.localDefId;
  if (!defId) return [];

  const site = bindingInitFor(ctx.symbolIndex, defId);
  if (!site) return [];

  const lineText = snippetLine(ctx.methodCode, site.lineNumber, ctx.methodStartLine);
  if (!lineText) return [];

  const tokens = tokenizeLine(lineText).tokens;
  const receivers = memberAccessReceiverIndices(tokens, site.tokenIndex);
  if (receivers.length === 0) return [];

  const pane = graphPane();
  if (!pane) return [];

  const edges: PreviewEdgeSpec[] = [];
  let idx = 0;

  for (const receiverIdx of receivers) {
    const tok = tokens[receiverIdx];
    if (!tok || tok.kind !== "identifier") continue;

    const targetId = usageTargetFor(ctx.symbolIndex, site.lineNumber, receiverIdx);
    if (!targetId) continue;

    const receiverEl = findReceiverChip(
      pane,
      ctx.flowNodeId,
      ctx.memberId,
      site.lineNumber,
      receiverIdx,
      tok.text,
    );
    const paramDefEl = findLocalDefElement(pane, targetId);
    if (!receiverEl || !paramDefEl) continue;

    edges.push({
      ...buildElementPreviewEdge(
        `${ctx.edgeIdPrefix}-init-${idx}`,
        paramDefEl,
        receiverEl,
        "variable",
      ),
      hop: 3,
    });
    idx++;

    const paramName = paramNameFromDefId(targetId);
    if (paramName && targetId.includes("::param::")) {
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
    }
  }

  return edges;
}
