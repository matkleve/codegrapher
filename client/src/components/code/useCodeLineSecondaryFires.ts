import { useCallback } from "react";
import { useGraphActions } from "@/context/GraphInteractionContext";
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
  const { beginTrace, emitWireSignal } = useGraphActions();
  const { showUsageLoadMenu, showDefLoadMenu, clearConnectionMenu } =
    useCodeLinePreviewMenus(filePath);

  const buildImportPreview = useCallback(
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
      return {
        tokenKey,
        edges: [
          buildLoadPreviewEdge(edgeKey, cards, chipEl, importName, "type"),
        ],
      };
    },
    [filePath, lineNumber, memberId, sourceFlowId],
  );

  const fireImportPreview = useCallback(
    (specifier: string, chipEl: HTMLElement) => {
      const { tokenKey, edges } = buildImportPreview(specifier, chipEl);
      beginTrace(tokenKey, edges);
      const importName = specifier.replace(/^['"]|['"]$/g, "");
      showUsageLoadMenu(importName, "type", chipEl, edges[0].load!.candidates);
    },
    [beginTrace, buildImportPreview, showUsageLoadMenu],
  );

  const signalImportPreview = useCallback(
    (specifier: string, chipEl: HTMLElement) => {
      const { tokenKey, edges } = buildImportPreview(specifier, chipEl);
      emitWireSignal(tokenKey, edges);
    },
    [buildImportPreview, emitWireSignal],
  );

  const buildControlFlowPreview = useCallback(
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
      return {
        tokenKey: makeControlFlowKey(sourceFlowId, memberId, cfLine, cfTokenIndex),
        edges,
      };
    },
    [controlFlowIndex, memberId, sourceFlowId],
  );

  const fireControlFlowPreview = useCallback(
    (cfLine: number, cfTokenIndex: number, hostEl: HTMLElement) => {
      const { tokenKey, edges } = buildControlFlowPreview(cfLine, cfTokenIndex, hostEl);
      clearConnectionMenu();
      beginTrace(tokenKey, edges);
    },
    [beginTrace, buildControlFlowPreview, clearConnectionMenu],
  );

  const signalControlFlowPreview = useCallback(
    (cfLine: number, cfTokenIndex: number, hostEl: HTMLElement) => {
      const { tokenKey, edges } = buildControlFlowPreview(cfLine, cfTokenIndex, hostEl);
      emitWireSignal(tokenKey, edges);
    },
    [buildControlFlowPreview, emitWireSignal],
  );

  const fireCfFromRef = useCallback(
    (cfLine: number, cfTokenIndex: number, cfRefKey: string) => {
      const chipEl = chipRefs.current.get(cfRefKey)?.getChipElement();
      if (chipEl) fireControlFlowPreview(cfLine, cfTokenIndex, chipEl);
    },
    [fireControlFlowPreview, chipRefs],
  );

  const signalCfFromRef = useCallback(
    (cfLine: number, cfTokenIndex: number, cfRefKey: string) => {
      const chipEl = chipRefs.current.get(cfRefKey)?.getChipElement();
      if (chipEl) signalControlFlowPreview(cfLine, cfTokenIndex, chipEl);
    },
    [signalControlFlowPreview, chipRefs],
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

  const signalDefPreview = useCallback(
    (name: string, chipEl: HTMLElement) => {
      const tokenKey = makeMemberDefKey(sourceFlowId, memberId);
      const kind = semanticFromChipElement(chipEl, lookup(name));
      emitWireSignal(
        tokenKey,
        buildDefinitionPreviewEdges(name, kind, chipEl, defEdgeContext),
      );
    },
    [defEdgeContext, emitWireSignal, lookup, memberId, sourceFlowId],
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
    signalImportPreview,
    fireControlFlowPreview,
    signalControlFlowPreview,
    fireCfFromRef,
    signalCfFromRef,
    buildControlFlowPinInfo,
    fireDefPreview,
    signalDefPreview,
  };
}
