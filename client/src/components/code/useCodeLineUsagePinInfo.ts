import { useCallback } from "react";
import { connectionCountsForHost } from "@/lib/connectionCounts";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import { semanticFromChipElement } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import type { IndexContextValue } from "@/context/IndexContext";

type BuildUsagePinInfoArgs = {
  lookup: IndexContextValue["lookup"];
  hasSymbol: (name: string) => boolean;
  defEdgeContext: DefinitionEdgeContext;
  definedInLabel: string;
  filePath: string;
  lineNumber: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
};

export function useCodeLineUsagePinInfo({
  lookup,
  hasSymbol,
  defEdgeContext,
  definedInLabel,
  filePath,
  lineNumber,
  sourceFlowId,
  sourceGraphNodeId,
}: BuildUsagePinInfoArgs) {
  return useCallback(
    (name: string, el: HTMLElement, isDefinition: boolean) => {
      const entry = lookup(name);
      const kind = semanticFromChipElement(el, entry);
      const counts = connectionCountsForHost(
        el,
        hasSymbol(name) ? name : undefined,
        isDefinition ? defEdgeContext : undefined,
      );
      return makeTokenInfo({
        token: name,
        kind,
        connectionCount: counts.onCanvas,
        projectConnectionCount: counts.inProject,
        definedIn: definedInLabel,
        filePath,
        line: lineNumber,
        sourceFlowId,
        sourceGraphNodeId,
        role: isDefinition ? "definition" : "usage",
        pinned: true,
      });
    },
    [
      defEdgeContext,
      definedInLabel,
      filePath,
      hasSymbol,
      lineNumber,
      lookup,
      sourceFlowId,
      sourceGraphNodeId,
    ],
  );
}
