import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import {
  buildLoadPreviewEdge,
  buildUsagePreviewEdge,
  liveFromDefEl,
  liveToFromUsageEl,
} from "@/lib/buildPreviewEdges";
import {
  findParamDefCoLocated,
  findParamTypeChipCoLocated,
} from "@/lib/paramTypeAnchors";
import { primaryIndexedSymbolInType } from "@/lib/formatSignatureType";
import { parseMethodSignature } from "@/lib/parseMethodSignature";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  buildExternalReferenceCards,
  resolveVisibleTarget,
} from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphData, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

export type ParamTypeCascadeContext = {
  paramName: string;
  paramDefEl: HTMLElement;
  flowNodeId: string;
  memberId: string;
  symbols: Map<string, SymbolEntry[]>;
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  hasSymbol: (name: string) => boolean;
  edgeIdPrefix: string;
};

/** `local-def::{memberId}::param::{name}::{line}` → param name. */
export function paramNameFromDefId(defId: string): string | null {
  const match = defId.match(/::param::([^:]+)::/);
  return match?.[1] ?? null;
}

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

function paramTypeString(
  flowNodeId: string,
  memberId: string,
  paramName: string,
  getNode: (id: string) => Node | undefined,
): string | null {
  const classData = getClassNodeData(flowNodeId, getNode);
  const method = classData?.methods.find((m) => m.id === memberId);
  if (!method?.code) return null;
  const signature = parseMethodSignature(method.code);
  if (!signature) return null;
  return signature.params.find((p) => p.name === paramName)?.type ?? null;
}

/**
 * Tier 2/3 provenance wires: sig-type → param def, then type def → sig-type (or Load stub).
 * See docs/specs/system/preview-edges.trace-strength.supplement.md
 */
export function buildParamTypeCascadeEdges(
  ctx: ParamTypeCascadeContext,
): PreviewEdgeSpec[] {
  const {
    paramName,
    paramDefEl,
    flowNodeId,
    memberId,
    symbols,
    graphData,
    getNode,
    hasSymbol,
    edgeIdPrefix,
  } = ctx;

  const typeStr = paramTypeString(flowNodeId, memberId, paramName, getNode);
  if (!typeStr) return [];

  const symbolName = primaryIndexedSymbolInType(typeStr, hasSymbol);
  if (!symbolName) return [];

  const sigTypeEl = findParamTypeChipCoLocated(
    flowNodeId,
    memberId,
    paramName,
    symbolName,
    paramDefEl,
    getNode,
  );
  if (!sigTypeEl) return [];

  const resolvedParamDef = paramDefEl.isConnected
    ? paramDefEl
    : findParamDefCoLocated(
        flowNodeId,
        memberId,
        paramName,
        sigTypeEl,
        paramDefEl.dataset.localDefId,
      ) ?? paramDefEl;

  const typeKind: SemanticTokenKind = "type";

  const tier2: PreviewEdgeSpec = {
    id: `${edgeIdPrefix}-prov-type-param`,
    from: { type: "element", el: sigTypeEl },
    to: { type: "element", el: resolvedParamDef },
    kind: typeKind,
    connectionKind: "typesetting",
    hop: 2,
    liveFrom:
      liveToFromUsageEl(symbolName, sigTypeEl) ?? {
        token: symbolName,
        flowNodeId,
        memberId,
        role: "usage",
        traceKey: sigTypeEl.dataset.traceKey,
      },
    liveTo: liveFromDefEl(paramName, resolvedParamDef, flowNodeId, memberId),
  };

  let resolved = resolveVisibleTarget(
    symbolName,
    symbols,
    graphData,
    getNode,
    flowNodeId,
  );
  if (!resolved) {
    const indexCards = buildExternalReferenceCards(symbolName, symbols);
    if (indexCards.length === 0) return [tier2];
    resolved = { mode: "external", cards: indexCards };
  }

  if (resolved.mode === "external") {
    if (resolved.cards.length === 0) return [tier2];
    const loadEdge = buildLoadPreviewEdge(
      `${edgeIdPrefix}-prov-type-def`,
      resolved.cards,
      sigTypeEl,
      symbolName,
      typeKind,
    );
    return [tier2, { ...loadEdge, hop: 3 }];
  }

  const tier3 = buildUsagePreviewEdge(
    `${edgeIdPrefix}-prov-type-def`,
    resolved,
    sigTypeEl,
    symbolName,
  );
  return [tier2, { ...tier3, hop: 3 }];
}
