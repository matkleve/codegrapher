import { useCallback, useMemo } from "react";
import { collectGraphFilePaths } from "@/lib/graphFiles";
import {
  enrichCallSites,
  offCanvasCallSiteFiles,
  projectReferencesForToken,
  type CallSiteReference,
} from "@/lib/projectReferences";
import { findSemanticReferences, type TokenReference } from "@/lib/semanticLookup";
import type { GraphData, ReferenceEntry, SymbolEntry } from "@/types";

type UseConnectionLookupsArgs = {
  graphData: GraphData | null;
  symbols: Map<string, SymbolEntry[]>;
  references: Map<string, ReferenceEntry[]>;
};

/** Read-only symbol/reference lookups shared by hover-info and load-menu callers. */
export function useConnectionLookups({
  graphData,
  symbols,
  references,
}: UseConnectionLookupsArgs) {
  const findReferences = useCallback(
    (token: string): TokenReference[] =>
      findSemanticReferences(token, symbols, graphData),
    [graphData, symbols],
  );

  const graphFilePaths = useMemo(
    () => collectGraphFilePaths(graphData),
    [graphData],
  );

  const lookupProjectReferences = useCallback(
    (token: string): ReferenceEntry[] => projectReferencesForToken(references, token),
    [references],
  );

  const lookupOffCanvasCallSiteFiles = useCallback(
    (token: string): ReferenceEntry[] =>
      offCanvasCallSiteFiles(
        projectReferencesForToken(references, token),
        graphFilePaths,
      ),
    [graphFilePaths, references],
  );

  const findCallSites = useCallback(
    (token: string): CallSiteReference[] =>
      enrichCallSites(projectReferencesForToken(references, token), graphFilePaths),
    [graphFilePaths, references],
  );

  return useMemo(
    () => ({
      findReferences,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
      findCallSites,
    }),
    [findReferences, lookupProjectReferences, lookupOffCanvasCallSiteFiles, findCallSites],
  );
}
