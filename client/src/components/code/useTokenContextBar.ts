import { useEffect, useMemo, useRef, useState } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import { fromExternalCards, fromTokenReferences } from "@/lib/loadTargets";
import { connectionCountLabel } from "@/lib/projectReferences";
import type { TokenReference } from "@/lib/semanticLookup";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
import type { LoadTargetItem } from "@/lib/loadTargets";

function definitionRef(refs: TokenReference[]): TokenReference | null {
  const inGraph = refs.filter((r) => r.inGraph && r.flowNodeId);
  return inGraph[0] ?? refs[0] ?? null;
}

export function useTokenContextBar() {
  const {
    tokenInfo,
    clearTokenInfo,
    findReferences,
    findCallSites,
    focusFlowNode,
    pinnedTraces,
    activePinKey,
    setActivePinKey,
    goBackPin,
    canGoBackPin,
  } = useGraphInteraction();
  const loadTarget = useLoadTargetAction();
  const loadButtonRef = useRef<HTMLButtonElement>(null);
  const [loadPickerOpen, setLoadPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isDefinition = tokenInfo?.role === "definition";

  useEffect(() => {
    setExpanded(false);
    setLoadPickerOpen(false);
  }, [tokenInfo?.token]);

  useEffect(() => {
    if (!tokenInfo?.pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearTokenInfo();
      if (e.altKey && e.key === "ArrowLeft" && canGoBackPin) {
        e.preventDefault();
        goBackPin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canGoBackPin, clearTokenInfo, goBackPin, tokenInfo?.pinned]);

  const references = useMemo(
    () => (tokenInfo && !isDefinition ? findReferences(tokenInfo.token) : []),
    [findReferences, isDefinition, tokenInfo],
  );

  const callSites = useMemo(
    () => (tokenInfo && isDefinition ? findCallSites(tokenInfo.token) : []),
    [findCallSites, isDefinition, tokenInfo],
  );

  const graphRefs = useMemo(
    () => references.filter((r) => r.inGraph && r.flowNodeId),
    [references],
  );

  const externalRefs = useMemo(
    () => references.filter((r) => !r.inGraph),
    [references],
  );

  const externalCallSiteFiles = useMemo(() => {
    const seen = new Set<string>();
    return callSites.filter((site) => {
      if (site.inGraph) return false;
      if (seen.has(site.filePath)) return false;
      seen.add(site.filePath);
      return true;
    });
  }, [callSites]);

  const externalLoadTargets = useMemo(
    (): LoadTargetItem[] =>
      isDefinition
        ? fromExternalCards(
            externalCallSiteFiles.map((site) => ({
              symbolName: tokenInfo?.token ?? "",
              filePath: site.filePath,
              line: site.line,
              occurrenceCount: 1,
            })),
          )
        : fromTokenReferences(externalRefs),
    [externalCallSiteFiles, externalRefs, isDefinition, tokenInfo?.token],
  );

  const def = tokenInfo ? definitionRef(references) : null;
  const isPinned = Boolean(tokenInfo?.pinned);
  const canJumpDef = !isDefinition && Boolean(def?.flowNodeId);
  const connectionLabel = tokenInfo
    ? connectionCountLabel({
        onCanvas: tokenInfo.connectionCount,
        inProject: tokenInfo.projectConnectionCount,
      })
    : "";
  const listCount = isDefinition ? callSites.length : references.length;

  return {
    tokenInfo: tokenInfo as TokenInfoState | null,
    clearTokenInfo,
    focusFlowNode,
    pinnedTraces,
    activePinKey,
    setActivePinKey,
    goBackPin,
    canGoBackPin,
    loadTarget,
    loadButtonRef,
    loadPickerOpen,
    setLoadPickerOpen,
    expanded,
    setExpanded,
    isDefinition,
    isPinned,
    def,
    canJumpDef,
    connectionLabel,
    listCount,
    callSites,
    graphRefs,
    externalRefs,
    externalLoadTargets,
  };
}
