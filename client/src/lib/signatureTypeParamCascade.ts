import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { liveFromDefEl, liveToFromUsageEl } from "@/lib/buildPreviewEdges";
import { buildDefRelativePreviewEdges } from "@/lib/defRelativePreviewEdges";
import { paramDefForName, type MemberSymbolIndex } from "@/lib/localSymbolLinks";
import { findParamDefCoLocated } from "@/lib/paramTypeAnchors";
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

function memberSnippet(
  flowNodeId: string,
  memberId: string,
  getNode: (id: string) => Node | undefined,
): { code: string; startLine: number } | null {
  const classData = getClassNodeData(flowNodeId, getNode);
  const method = classData?.methods.find((m) => m.id === memberId);
  if (!method?.code) return null;
  return { code: method.code, startLine: method.startLine ?? 1 };
}

export type SignatureTypeParamCascadeContext = {
  symbolName: string;
  typeKind: SemanticTokenKind;
  sigTypeEl: HTMLElement;
  paramName: string;
  symbolIndex: MemberSymbolIndex;
  flowNodeId: string;
  memberId: string;
  symbols: Map<string, SymbolEntry[]>;
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  edgeIdPrefix: string;
};

/**
 * Forward cascade from a signature type chip: sig-type → param slot → in-body
 * usages and lexical relatives (`result` → `addr` → `addr.city`).
 */
export function buildSignatureTypeParamCascade(
  ctx: SignatureTypeParamCascadeContext,
): PreviewEdgeSpec[] {
  const paramDef = paramDefForName(ctx.symbolIndex, ctx.memberId, ctx.paramName);
  if (!paramDef) return [];

  const classData = getClassNodeData(ctx.flowNodeId, ctx.getNode);
  const snippet = memberSnippet(ctx.flowNodeId, ctx.memberId, ctx.getNode);
  if (!classData || !snippet) return [];

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
      hop: 2,
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

  if (paramDef) {
    edges.push(
      ...buildDefRelativePreviewEdges({
        originDefId: paramDef.defId,
        originEl: paramAnchor,
        symbolIndex: ctx.symbolIndex,
        methodCode: snippet.code,
        methodStartLine: snippet.startLine,
        flowNodeId: ctx.flowNodeId,
        memberId: ctx.memberId,
        classData,
        kind: "variable",
        edgeIdPrefix: `${ctx.edgeIdPrefix}-rel`,
        includeDirectUsages: true,
        preferOriginEl: true,
        hopOffset: 2,
      }),
    );
  }

  return edges;
}
