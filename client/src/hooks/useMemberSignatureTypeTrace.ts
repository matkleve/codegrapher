import { useCallback, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { buildSignatureTypeUsageEdges } from "@/lib/signatureTypeEdges";
import { traceSigTypeEdges } from "@/lib/traceEdgesForOrigin";
import { connectionCountsForHost } from "@/lib/connectionCounts";
import {
  buildHoverLoadMenu,
  loadTargetsFromExternalCards,
} from "@/lib/connectionMenu";
import { primaryIndexedSymbolInType } from "@/lib/formatSignatureType";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { makeSignatureTypeKey } from "@/lib/traceKeys";

import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import type { LexicalGraph } from "@/lib/lexicalGraph";

type UseMemberSignatureTypeTraceArgs = {
  type: string;
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  chipRef: RefObject<TokenChipHandle | null>;
  hostRef: RefObject<HTMLElement | null>;
  /** Set for param input types (`result: GeocoderSearchResult`). */
  paramName?: string;
  symbolIndex?: MemberSymbolIndex;
  lexicalGraph?: LexicalGraph;
  methodCode?: string;
  methodStartLine?: number;
};

export function useMemberSignatureTypeTrace({
  type,
  memberId,
  flowNodeId,
  graphNodeId,
  filePath,
  chipRef,
  hostRef,
  paramName,
  symbolIndex,
  lexicalGraph,
  methodCode,
  methodStartLine,
}: UseMemberSignatureTypeTraceArgs) {
  const { hasSymbol, symbols } = useIndex();
  const { getNode } = useReactFlow();
  const {
    beginTrace,
    emitWireSignal,
    graphData,
    showConnectionMenu,
    clearConnectionMenu,
  } = useGraphInteraction();

  const symbolName = primaryIndexedSymbolInType(type, hasSymbol);
  const indexed = Boolean(symbolName);
  // Signature type position always uses type ink (teal) — see token-interactions.md.
  const semantic: SemanticTokenKind = "type";
  const tokenKey = symbolName
    ? makeSignatureTypeKey(flowNodeId, memberId, symbolName)
    : "";

  const resolveHost = () =>
    chipRef.current?.getChipElement() ?? hostRef.current;

  const buildEdges = useCallback(() => {
    if (!symbolName || !tokenKey) return [];
    const chipEl = resolveHost();
    if (!chipEl) return [];
    const edges = buildSignatureTypeUsageEdges(
      symbolName,
      semantic,
      chipEl,
      symbols,
      graphData,
      getNode,
      flowNodeId,
      memberId,
    );
    if (paramName && symbolIndex && lexicalGraph && methodCode && methodStartLine != null) {
      edges.push(
        ...traceSigTypeEdges({
          symbolName,
          typeKind: semantic,
          sigTypeEl: chipEl,
          paramName,
          symbolIndex,
          lexicalGraph,
          methodCode,
          methodStartLine,
          flowNodeId,
          memberId,
          symbols,
          graphData,
          getNode,
          hasSymbol,
          edgeIdPrefix: `sig-type-${paramName}`,
        }),
      );
    }
    return edges;
  }, [
    flowNodeId,
    getNode,
    graphData,
    hasSymbol,
    lexicalGraph,
    memberId,
    methodCode,
    methodStartLine,
    paramName,
    semantic,
    symbolIndex,
    symbolName,
    symbols,
    tokenKey,
  ]);

  const signalPreview = useCallback(() => {
    const edges = buildEdges();
    if (edges.length === 0) return;
    emitWireSignal(tokenKey, edges);
  }, [buildEdges, emitWireSignal, tokenKey]);

  const firePreview = useCallback(() => {
    const edges = buildEdges();
    if (edges.length === 0) return;
    beginTrace(tokenKey, edges);
    if (edges.some((e) => e.load)) {
      const chipEl = resolveHost();
      if (!chipEl) return;
      const resolved = resolveVisibleTarget(
        symbolName,
        symbols,
        graphData,
        getNode,
        flowNodeId,
      );
      if (resolved?.mode === "external") {
        const menuState = buildHoverLoadMenu(
          symbolName,
          semantic,
          "usage",
          chipEl,
          loadTargetsFromExternalCards(resolved.cards),
          filePath,
        );
        if (menuState) showConnectionMenu(menuState);
        else clearConnectionMenu();
      }
    } else {
      clearConnectionMenu();
    }
  }, [
    beginTrace,
    buildEdges,
    clearConnectionMenu,
    filePath,
    flowNodeId,
    getNode,
    graphData,
    hasSymbol,
    semantic,
    showConnectionMenu,
    symbolName,
    symbols,
    tokenKey,
  ]);

  const buildPinInfo = useCallback(() => {
    const chipEl = resolveHost();
    const counts = chipEl
      ? connectionCountsForHost(chipEl, symbolName ?? undefined)
      : { onCanvas: 0, inProject: 0 };
    return makeTokenInfo({
      token: symbolName ?? type,
      kind: semantic,
      connectionCount: counts.onCanvas,
      projectConnectionCount: counts.inProject,
      definedIn: symbolName ?? type,
      filePath,
      line: 1,
      sourceFlowId: flowNodeId,
      sourceGraphNodeId: graphNodeId,
      role: "usage",
      pinned: true,
    });
  }, [filePath, flowNodeId, graphNodeId, semantic, symbolName, type]);

  const { onEnter, onLeave, onFocus, onBlur } = useTokenHover({
    tokenKey,
    enabled: indexed,
    onFire: firePreview,
    onSignal: signalPreview,
    onClear: () => {},
    traceHost: resolveHost,
    buildTransientInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  const { onPinClick } = useTokenPin({
    tokenKey,
    enabled: indexed,
    onFire: firePreview,
    buildPinInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  return {
    symbolName,
    semantic,
    tokenKey,
    indexed,
    onEnter,
    onLeave,
    onFocus,
    onBlur,
    onPinClick,
  };
}
