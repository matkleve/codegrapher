import { useCallback, type RefObject } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenContextMenu } from "@/hooks/useTokenContextMenu";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { buildDefinitionPreviewEdges } from "@/lib/buildDefinitionPreviewEdges";
import {
  buildHoverLoadMenu,
  loadTargetsFromCallSiteRefs,
} from "@/lib/connectionMenu";
import { connectionCountsForHost } from "@/lib/connectionCounts";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";

type SimulationAnchorArgs = {
  methodName: string;
  code: string;
  signatureLine: string;
  methodStartLine: number;
};

type UseDefinitionTraceOptions = {
  anchorRef: RefObject<HTMLElement | null>;
  tokenKey: string;
  traceName: string;
  defKind: SemanticTokenKind | null;
  enabled: boolean;
  defEdgeContext: DefinitionEdgeContext;
  filePath: string;
  definedIn: string;
  line: number;
  flowNodeId: string;
  graphNodeId: string;
  editorLine: number;
  sourceMemberId?: string;
  simulation?: SimulationAnchorArgs;
  traceHost?: () => HTMLElement | null;
};

export function useDefinitionTrace({
  anchorRef,
  tokenKey,
  traceName,
  defKind,
  enabled,
  defEdgeContext,
  filePath,
  definedIn,
  line,
  flowNodeId,
  graphNodeId,
  editorLine,
  sourceMemberId,
  simulation,
  traceHost,
}: UseDefinitionTraceOptions) {
  const {
    beginTrace,
    lookupOffCanvasCallSiteFiles,
    showConnectionMenu,
    clearConnectionMenu,
  } = useGraphInteraction();

  const fireDefPreview = useCallback(() => {
    if (!enabled || !anchorRef.current || !defKind) return;
    beginTrace(
      tokenKey,
      buildDefinitionPreviewEdges(
        traceName,
        defKind,
        anchorRef.current,
        defEdgeContext,
      ),
    );
    const sites = lookupOffCanvasCallSiteFiles(traceName);
    const menuState = buildHoverLoadMenu(
      traceName,
      defKind,
      "definition",
      anchorRef.current,
      loadTargetsFromCallSiteRefs(traceName, sites),
      filePath,
    );
    if (menuState) showConnectionMenu(menuState);
    else clearConnectionMenu();
  }, [
    anchorRef,
    beginTrace,
    clearConnectionMenu,
    defEdgeContext,
    defKind,
    enabled,
    filePath,
    lookupOffCanvasCallSiteFiles,
    showConnectionMenu,
    tokenKey,
    traceName,
  ]);

  const buildPinInfo = useCallback(() => {
    const counts = connectionCountsForHost(
      anchorRef.current!,
      traceName,
      defEdgeContext,
    );
    return makeTokenInfo({
      token: traceName,
      kind: defKind!,
      connectionCount: counts.onCanvas,
      projectConnectionCount: counts.inProject,
      definedIn,
      filePath,
      line,
      sourceFlowId: flowNodeId,
      sourceGraphNodeId: graphNodeId,
      role: "definition",
      pinned: true,
    });
  }, [
    anchorRef,
    defEdgeContext,
    defKind,
    definedIn,
    filePath,
    flowNodeId,
    graphNodeId,
    line,
    traceName,
  ]);

  const { onEnter, onLeave, onFocus, onBlur } = useTokenHover({
    tokenKey,
    enabled,
    onFire: fireDefPreview,
    onClear: () => {},
    traceHost,
    buildTransientInfo: () => {
      const info = buildPinInfo();
      const { pinned: _p, ...rest } = info;
      return rest;
    },
  });

  const { onPinClick } = useTokenPin({
    tokenKey,
    enabled: enabled && Boolean(defKind),
    onFire: fireDefPreview,
    animateEl: undefined,
    buildPinInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  const openContextMenu = useTokenContextMenu({
    filePath,
    sourceFlowId: flowNodeId,
    sourceMemberId,
    simulation,
  });

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !anchorRef.current || !defKind) return;
      openContextMenu(e, {
        token: traceName,
        kind: defKind,
        role: "definition",
        chipEl: anchorRef.current,
        editorLine,
      });
    },
    [anchorRef, defKind, editorLine, enabled, openContextMenu, traceName],
  );

  return {
    fireDefPreview,
    onEnter,
    onLeave,
    onFocus,
    onBlur,
    onPinClick,
    onContextMenu,
  };
}
