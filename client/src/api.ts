import type { GraphData, ProjectIndexResponse, TreeResponse } from "./types";
import type { IndexProgressEvent } from "./lib/indexProgress";

const API_DOWN_HINT =
  "Can't reach the API server (port 3001). In a terminal, cd to the codegrapher folder and run npm run dev.";

async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(API_DOWN_HINT);
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
        ? API_DOWN_HINT
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

async function fetchProjectIndexOnce(
  folderPath: string,
): Promise<ProjectIndexResponse> {
  const res = await apiFetch(`/api/index?path=${encodeURIComponent(folderPath)}`);
  return parseJsonResponse(res, "Failed to index project");
}

function fetchProjectIndexStream(
  folderPath: string,
  onProgress: (event: IndexProgressEvent) => void,
): Promise<ProjectIndexResponse> {
  return new Promise((resolve, reject) => {
    const url = `/api/index/stream?path=${encodeURIComponent(folderPath)}`;
    const source = new EventSource(url);
    let settled = false;

    const finish = (result: ProjectIndexResponse) => {
      if (settled) return;
      settled = true;
      source.close();
      resolve(result);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      source.close();
      reject(new Error(message));
    };

    source.onmessage = (event) => {
      let body: {
        status?: IndexProgressEvent;
        payload?: ProjectIndexResponse;
        error?: string;
      };
      try {
        body = JSON.parse(event.data) as typeof body;
      } catch {
        fail("Failed to index project");
        return;
      }

      if (body.error) {
        fail(body.error);
        return;
      }

      if (body.status) {
        onProgress(body.status);
      }

      if (body.payload) {
        finish(body.payload);
      }
    };

    source.onerror = () => {
      if (settled) return;
      fail("Failed to index project");
    };
  });
}

export async function fetchProjectIndex(
  folderPath: string,
  onProgress?: (event: IndexProgressEvent) => void,
): Promise<ProjectIndexResponse> {
  if (!onProgress) {
    return fetchProjectIndexOnce(folderPath);
  }

  try {
    return await fetchProjectIndexStream(folderPath, onProgress);
  } catch {
    return fetchProjectIndexOnce(folderPath);
  }
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
