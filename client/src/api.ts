import type { GraphData, ProjectIndexResponse, TreeResponse } from "./types";

const API_DOWN_MSG =
  "API server is not running — run npm run dev from the project root";

async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(API_DOWN_MSG);
    }
    throw err;
  }
}

async function parseJsonResponse<T>(
  res: Response,
  fallbackError: string,
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.status === 502 || res.status === 503
        ? "API server is not running — run npm run dev from the project root"
        : fallbackError,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(fallbackError);
  }

  if (!res.ok) {
    const err = body as { error?: string };
    throw new Error(err.error ?? fallbackError);
  }

  return body as T;
}

export async function fetchProjectIndex(folderPath: string): Promise<ProjectIndexResponse> {
  const res = await apiFetch(`/api/index?path=${encodeURIComponent(folderPath)}`);
  return parseJsonResponse(res, "Failed to index project");
}

export async function browseFolder(): Promise<{ path: string } | { cancelled: true }> {
  const res = await apiFetch("/api/browse-folder", { method: "POST" });
  const body = await parseJsonResponse<{ cancelled?: boolean; path?: string; error?: string }>(
    res,
    "Failed to open folder picker",
  );
  if (body.cancelled) return { cancelled: true };
  return { path: body.path as string };
}

export async function fetchTree(dirPath: string): Promise<TreeResponse> {
  const res = await apiFetch(`/api/tree?path=${encodeURIComponent(dirPath)}`);
  return parseJsonResponse(res, "Failed to load folder");
}

export async function fetchFileGraph(filePath: string): Promise<GraphData> {
  const res = await apiFetch(`/api/file-graph?path=${encodeURIComponent(filePath)}`);
  return parseJsonResponse(res, "Failed to parse file");
}

export async function openFileInEditor(
  filePath: string,
  line = 1,
): Promise<{ success: boolean }> {
  const res = await apiFetch(
    `/api/open?path=${encodeURIComponent(filePath)}&line=${encodeURIComponent(String(line))}`,
  );
  return parseJsonResponse(res, "Failed to open file in editor");
}

export async function fetchFocus(filePath: string, depth = 1): Promise<GraphData> {
  const res = await apiFetch(
    `/api/focus?path=${encodeURIComponent(filePath)}&depth=${depth}`,
  );
  return parseJsonResponse(res, "Failed to load focus");
}
