import { useCallback } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import {
  buildContextMenu,
  buildDefinitionContextSections,
  buildUsageContextSections,
} from "@/lib/connectionMenu";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export type OpenContextMenuArgs = {
  token: string;
  kind: SemanticTokenKind;
  role: "usage" | "definition";
  chipEl: HTMLElement;
  editorLine?: number;
};

type UseTokenContextMenuArgs = {
  filePath: string;
  sourceFlowId: string;
  sourceMemberId?: string;
};

/** Right-click → full connection menu (jump + load). Does not pin. */
export function useTokenContextMenu({
  filePath,
  sourceFlowId,
  sourceMemberId,
}: UseTokenContextMenuArgs) {
  const {
    findReferences,
    findCallSites,
    lookupIndexedUsageSites,
    showConnectionMenu,
  } = useGraphInteraction();

  return useCallback(
    (e: React.MouseEvent, { token, kind, role, chipEl, editorLine }: OpenContextMenuArgs & { chipEl: HTMLElement }) => {
      e.preventDefault();
      e.stopPropagation();

      const sections =
        role === "usage"
          ? buildUsageContextSections(token, kind, findReferences(token))
          : buildDefinitionContextSections(
              token,
              kind,
              lookupIndexedUsageSites(token, sourceFlowId, sourceMemberId),
              findCallSites(token),
            );

      const editorTarget = { filePath, line: editorLine ?? 1 };

      const menu = buildContextMenu(
        token,
        kind,
        role,
        chipEl,
        sections,
        filePath,
        editorTarget,
      );
      if (menu) showConnectionMenu(menu);
    },
    [
      filePath,
      findCallSites,
      findReferences,
      lookupIndexedUsageSites,
      showConnectionMenu,
      sourceFlowId,
      sourceMemberId,
    ],
  );
}
