import {
  isFileInGraph,
  normalizeFilePath,
} from "@/lib/graphFiles";
import type { ReferenceEntry } from "@/types";

export type CallSiteReference = ReferenceEntry & {
  inGraph: boolean;
};

export type ConnectionCounts = {
  onCanvas: number;
  inProject: number;
};

export function projectReferencesForToken(
  references: Map<string, ReferenceEntry[]>,
  token: string,
): ReferenceEntry[] {
  return references.get(token) ?? [];
}

export function enrichCallSites(
  sites: ReferenceEntry[],
  graphFilePaths: Set<string>,
): CallSiteReference[] {
  return sites.map((site) => ({
    ...site,
    inGraph: isFileInGraph(site.filePath, graphFilePaths),
  }));
}

/** One row per off-canvas file (earliest call line wins). */
export function offCanvasCallSiteFiles(
  sites: ReferenceEntry[],
  graphFilePaths: Set<string>,
): ReferenceEntry[] {
  const byFile = new Map<string, ReferenceEntry>();
  for (const site of sites) {
    const file = normalizeFilePath(site.filePath);
    if (isFileInGraph(file, graphFilePaths)) continue;
    const prev = byFile.get(file);
    if (!prev || site.line < prev.line) byFile.set(file, { ...site, filePath: file });
  }
  return [...byFile.values()];
}

export function connectionCountLabel(counts: ConnectionCounts): string | null {
  if (counts.inProject <= 0) return null;
  if (counts.onCanvas <= 0) {
    return counts.inProject === 1
      ? "1 call site in project"
      : `${counts.inProject} call sites in project`;
  }
  if (counts.onCanvas >= counts.inProject) {
    return counts.onCanvas === 1
      ? "1 call site on canvas"
      : `${counts.onCanvas} call sites on canvas`;
  }
  return `${counts.onCanvas} on canvas · ${counts.inProject} in project`;
}
