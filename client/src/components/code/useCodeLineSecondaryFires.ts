import { useCallback } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import type { IndexContextValue } from "@/context/IndexContext";
import { buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { buildDefinitionPreviewEdges } from "@/lib/buildDefinitionPreviewEdges";
import { buildControlFlowPreviewEdges } from "@/lib/controlFlowPreviewEdges";
import { semanticFromChipElement } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import {
  makeControlFlowKey,
  makeMemberDefKey,
  makeImportSpecKey,
} from "@/lib/traceKeys";
import { resolveClientImportPath, normalizeLoadFilePath } from "@/lib/resolveImportPath";
import { ctrlPreviewEdgeId } from "@/lib/ctrlPreviewHandles";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import { useCodeLinePreviewMenus } from "@/components/code/useCodeLinePreviewMenus";

type SecondaryFiresArgs = {
  lineNumber: number;
  memberId: string;
  sourceFlowId: string;
  filePath: string;
  definedInLabel: string;
  sourceGraphNodeId: string;
  controlFlowIndex: ControlFlowIndex;
  chipRefs: React.RefObject<Map<string, TokenChipHandle>>;
  defEdgeContext: DefinitionEdgeContext;
  lookup: IndexContextValue["lookup"];
};

export function useCodeLineSecondaryFires({
  lineNumber,
  memberId,
  sourceFlowId,
  filePath,
  definedInLabel,
  sourceGraphNodeId,
  controlFlowIndex,
  chipRefs,
  defEdgeContext,
  lookup,
}: SecondaryFiresArgs) {
  const { beginTrace } = useGraphInteraction();
  const { showUsageLoadMenu, showDefLoadMenu, clearConnectionMenu } =
    useCodeLinePreviewMenus(filePath);

  const fireImportPreview = useCallback(
    (specifier: string, chipEl: HTMLElement) => {
      const tokenKey = makeImportSpecKey(
        sourceFlowId,
        memberId,
        lineNumber,
        specifier,
      );
      const edgeKey = ctrlPreviewEdgeId(
        sourceFlowId,
        `${memberId}::${lineNumber}::import::${specifier}`,
      );
      const resolvedPath = normalizeLoadFilePath(
        filePath,
        resolveClientImportPath(filePath, specifier),
      );
      const importName = specifier.replace(/^['"]|['"]$/g, "");
      const cards = [
        {
          symbolName: importName,
          filePath: resolvedPath,
          line: 1,
          occurrenceCount: 1,
        },
      ];
      beginTrace(tokenKey, [
        buildLoadPreviewEdge(edgeKey, cards, chipEl, importName, "type"),
      ]);
      showUsageLoadMenu(importName, "type", chipEl, cards);
    },
    [beginTrace, filePath, lineNumber, memberId, showUsageLoadMenu, sourceFlowId],
  );

  const fireControlFlowPreview = useCallback(
    (cfLine: number, cfTokenIndex: number, hostEl: HTMLElement) => {
      const edgeKey = ctrlPreviewEdgeId(
        sourceFlowId,
        `${memberId}::${cfLine}::cf-${cfTokenIndex}`,
      );
      const edges = buildControlFlowPreviewEdges(
        hostEl,
        controlFlowIndex,
        sourceFlowId,
        memberId,
        cfLine,
        cfTokenIndex,
        edgeKey,
      );
      clearConnectionMenu();
      beginTrace(
        makeControlFlowKey(sourceFlowId, memberId, cfLine, cfTokenIndex),
        edges,
      );
    },
    [beginTrace, clearConnectionMenu, controlFlowIndex, memberId, sourceFlowId],
  );

  const fireCfFromRef = useCallback(
    (cfLine: number, cfTokenIndex: number, cfRefKey: string) => {
      const chipEl = chipRefs.current.get(cfRefKey)?.getChipElement();
      if (chipEl) fireControlFlowPreview(cfLine, cfTokenIndex, chipEl);
    },
    [fireControlFlowPreview, chipRefs],
  );

  const buildControlFlowPinInfo = useCallback(
    (token: string, role: "definition" | "usage", cfLine: number): ReturnType<typeof makeTokenInfo> =>
      makeTokenInfo({
        token,
        kind: "variable",
        connectionCount: 0,
        projectConnectionCount: 0,
        definedIn: definedInLabel,
        filePath,
        line: cfLine,
        sourceFlowId,
        sourceGraphNodeId,
        role,
        pinned: true,
      }),
    [definedInLabel, filePath, sourceFlowId, sourceGraphNodeId],
  );

  const fireDefPreview = useCallback(
    (name: string, chipEl: HTMLElement) => {
      const tokenKey = makeMemberDefKey(sourceFlowId, memberId);
      const kind = semanticFromChipElement(chipEl, lookup(name));
      beginTrace(
        tokenKey,
        buildDefinitionPreviewEdges(name, kind, chipEl, defEdgeContext),
      );
      showDefLoadMenu(name, kind, chipEl);
    },
    [beginTrace, defEdgeContext, lookup, memberId, showDefLoadMenu, sourceFlowId],
  );

  return {
    fireImportPreview,
    fireControlFlowPreview,
    fireCfFromRef,
    buildControlFlowPinInfo,
    fireDefPreview,
  };
}
