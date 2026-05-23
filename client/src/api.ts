import type { GraphData, ProjectIndexResponse, TreeResponse } from "./types";

export async function fetchProjectIndex(folderPath: string): Promise<ProjectIndexResponse> {
  const res = await fetch(`/api/index?path=${encodeURIComponent(folderPath)}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to index project");
  return body as ProjectIndexResponse;
}

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

export async function openFileInEditor(
  filePath: string,
  line = 1,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `/api/open?path=${encodeURIComponent(filePath)}&line=${encodeURIComponent(String(line))}`,
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to open file in editor");
  return body as { success: boolean };
}

export async function fetchFocus(filePath: string, depth = 1): Promise<GraphData> {
  const res = await fetch(
    `/api/focus?path=${encodeURIComponent(filePath)}&depth=${depth}`,
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to load focus");
  return body as GraphData;
}
