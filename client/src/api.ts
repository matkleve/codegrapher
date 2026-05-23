import type { GraphData, TreeResponse } from "./types";

export async function browseFolder(): Promise<{ path: string } | { cancelled: true }> {
  const res = await fetch("/api/browse-folder", { method: "POST" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to open folder picker");
  if (body.cancelled) return { cancelled: true };
  return { path: body.path as string };
}

export async function fetchTree(dirPath: string): Promise<TreeResponse> {
  const res = await fetch(`/api/tree?path=${encodeURIComponent(dirPath)}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to load folder");
  return body as TreeResponse;
}

export async function fetchFileGraph(filePath: string): Promise<GraphData> {
  const res = await fetch(`/api/file-graph?path=${encodeURIComponent(filePath)}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to parse file");
  return body as GraphData;
}

export async function fetchFocus(filePath: string, depth = 1): Promise<GraphData> {
  const res = await fetch(
    `/api/focus?path=${encodeURIComponent(filePath)}&depth=${depth}`,
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to load focus");
  return body as GraphData;
}
