import { useCallback } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import {
  buildHoverLoadMenu,
  loadTargetsFromExternalCards,
  loadTargetsFromCallSiteRefs,
} from "@/lib/connectionMenu";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export function useCodeLinePreviewMenus(filePath: string) {
  const {
    showConnectionMenu,
    clearConnectionMenu,
    lookupOffCanvasCallSiteFiles,
  } = useGraphInteraction();

  const showUsageLoadMenu = useCallback(
    (
      name: string,
      kind: SemanticTokenKind,
      chipEl: HTMLElement,
      cards: Parameters<typeof loadTargetsFromExternalCards>[0],
    ) => {
      const menuState = buildHoverLoadMenu(
        name,
        kind,
        "usage",
        chipEl,
        loadTargetsFromExternalCards(cards),
        filePath,
      );
      if (menuState) showConnectionMenu(menuState);
      else clearConnectionMenu();
    },
    [clearConnectionMenu, filePath, showConnectionMenu],
  );

  const showDefLoadMenu = useCallback(
    (name: string, kind: ReturnType<typeof semanticFromChipElement>, chipEl: HTMLElement) => {
      const sites = lookupOffCanvasCallSiteFiles(name);
      const menuState = buildHoverLoadMenu(
        name,
        kind,
        "definition",
        chipEl,
        loadTargetsFromCallSiteRefs(name, sites),
        filePath,
      );
      if (menuState) showConnectionMenu(menuState);
      else clearConnectionMenu();
    },
    [clearConnectionMenu, filePath, lookupOffCanvasCallSiteFiles, showConnectionMenu],
  );

  return { showUsageLoadMenu, showDefLoadMenu, clearConnectionMenu };
}
