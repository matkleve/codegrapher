import { useCallback, useMemo, type RefObject } from "react";
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
  const entry = symbolName ? lookup(symbolName) : undefined;
  const semantic = entry ? symbolKindToSemantic(entry.kind) : "type";
  const tokenKey = symbolName
    ? makeSignatureTypeKey(flowNodeId, memberId, symbolName)
    : "";

  const connectable = useMemo(() => {
    if (!symbolName) return false;
    return (
      resolveVisibleTarget(symbolName, symbols, graphData, getNode, flowNodeId) !=
      null
    );
  }, [flowNodeId, getNode, graphData, symbolName, symbols]);

  const resolveHost = () =>
    chipRef.current?.getChipElement() ?? hostRef.current;

  const showUsageLoadMenu = (chipEl: HTMLElement) => {
    if (!symbolName) return;
    const resolved = resolveVisibleTarget(
      symbolName,
      symbols,
      graphData,
      getNode,
      flowNodeId,
    );
    if (!resolved || resolved.mode !== "external") {
      clearConnectionMenu();
      return;
    }
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
  };

  const firePreview = useCallback(() => {
    if (!symbolName || !connectable) return;
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
    if (edges.some((e) => e.load)) showUsageLoadMenu(chipEl);
    else clearConnectionMenu();
  }, [
    beginTrace,
    clearConnectionMenu,
    connectable,
    flowNodeId,
    getNode,
    graphData,
    memberId,
    semantic,
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
    enabled: connectable,
    onFire: firePreview,
    onClear: () => {},
    buildTransientInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  const { onPinClick } = useTokenPin({
    tokenKey,
    enabled: connectable,
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
    connectable,
    onEnter,
    onLeave,
    onPinClick,
  };
}
