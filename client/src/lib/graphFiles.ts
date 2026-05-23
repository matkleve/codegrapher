import type { GraphData } from "@/types";

export function normalizeFilePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

/** Unique file paths represented in the current graph. */
export function collectGraphFilePaths(data: GraphData | null): Set<string> {
  if (!data) return new Set();
  const paths = new Set<string>();
  for (const node of data.nodes) {
    if (node.filePath?.trim()) paths.add(normalizeFilePath(node.filePath));
  }
  return paths;
}

export function isFileInGraph(filePath: string, graphFilePaths: Set<string>): boolean {
  return graphFilePaths.has(normalizeFilePath(filePath));
}
