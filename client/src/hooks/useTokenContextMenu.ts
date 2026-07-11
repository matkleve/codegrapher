import { useCallback } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useSimulationOptional } from "@/context/SimulationContext";
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

type SimulationAnchorArgs = {
  methodName: string;
  code: string;
  signatureLine: string;
  methodStartLine: number;
};

type UseTokenContextMenuArgs = {
  filePath: string;
  sourceFlowId: string;
  sourceMemberId?: string;
  simulation?: SimulationAnchorArgs;
};

/** Right-click → full connection menu (jump + load). Does not pin. */
export function useTokenContextMenu({
  filePath,
  sourceFlowId,
  sourceMemberId,
  simulation,
}: UseTokenContextMenuArgs) {
  const {
    findReferences,
    findCallSites,
    lookupIndexedUsageSites,
    showConnectionMenu,
  } = useGraphInteraction();
  const sim = useSimulationOptional();

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
      if (!menu) return;

      if (sim && simulation && sourceMemberId) {
        const lineNumber = editorLine ?? 1;
        const simAnchor = {
          flowNodeId: sourceFlowId,
          memberId: sourceMemberId,
          methodName: simulation.methodName,
          code: simulation.code,
          signatureLine: simulation.signatureLine,
          methodStartLine: simulation.methodStartLine,
          filePath,
          startLine: lineNumber,
        };
        showConnectionMenu({
          ...menu,
          simActions: [
            {
              id: "sim-start",
              label: "Start trace here",
              onSelect: () => sim.requestStartHere(simAnchor),
            },
            {
              id: "sim-end",
              label: "Set as end point",
              onSelect: () => sim.requestEndHere(lineNumber, sourceMemberId),
            },
            {
              id: "sim-run",
              label: "Run start → end",
              onSelect: () => sim.runStartToEnd(simAnchor),
            },
          ],
        });
        return;
      }

      showConnectionMenu(menu);
    },
    [
      filePath,
      findCallSites,
      findReferences,
      lookupIndexedUsageSites,
      showConnectionMenu,
      sim,
      simulation,
      sourceFlowId,
      sourceMemberId,
    ],
  );
}
