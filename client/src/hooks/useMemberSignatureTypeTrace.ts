import { useCallback, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import {
  buildSignatureTypeUsageEdges,
  connectionCountsForHost,
} from "@/lib/linksForElement";
import {
  buildHoverLoadMenu,
  loadTargetsFromExternalCards,
} from "@/lib/connectionMenu";
import { primaryIndexedSymbolInType } from "@/lib/formatSignatureType";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeSignatureTypeKey } from "@/lib/traceKeys";

type UseMemberSignatureTypeTraceArgs = {
  type: string;
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  chipRef: RefObject<TokenChipHandle | null>;
  hostRef: RefObject<HTMLButtonElement | null>;
};

export function useMemberSignatureTypeTrace({
  type,
  memberId,
  flowNodeId,
  graphNodeId,
  filePath,
  chipRef,
  hostRef,
}: UseMemberSignatureTypeTraceArgs) {
  const { lookup, hasSymbol, symbols } = useIndex();
  const { getNode } = useReactFlow();
  const {
    beginTrace,
    graphData,
    showConnectionMenu,
    clearConnectionMenu,
  } = useGraphInteraction();

  const symbolName = primaryIndexedSymbolInType(type, hasSymbol);
  const indexed = Boolean(symbolName);
  const entry = symbolName ? lookup(symbolName) : undefined;
  const semantic = entry ? symbolKindToSemantic(entry.kind) : "type";
  const tokenKey = symbolName
    ? makeSignatureTypeKey(flowNodeId, memberId, symbolName)
    : "";

  const resolveHost = () =>
    chipRef.current?.getChipElement() ?? hostRef.current;

  const firePreview = useCallback(() => {
    if (!symbolName || !tokenKey) return;
    const chipEl = resolveHost();
    if (!chipEl) return;
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
    beginTrace(tokenKey, edges);
    if (edges.some((e) => e.load)) {
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
    clearConnectionMenu,
    filePath,
    flowNodeId,
    getNode,
    graphData,
    memberId,
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

  const { onEnter, onLeave } = useTokenHover({
    tokenKey,
    enabled: indexed,
    onFire: firePreview,
    onClear: () => {},
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
    onPinClick,
  };
}
