const STORAGE_KEY = "codegrapher:sim-paths";
const MAX_PATHS = 50;

export type SimTracePath = {
  id: string;
  label: string;
  flowNodeId: string;
  memberId: string;
  methodName: string;
  filePath: string;
  code: string;
  signatureLine: string;
  /** File-absolute line of `code`'s first line. Required for v1+ paths. */
  methodStartLine: number;
  startLine: number;
  endLine?: number;
  inputs: Record<string, string>;
  savedAt: string;
};

function readRaw(): SimTracePath[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SimTracePath[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSimTracePaths(): SimTracePath[] {
  return readRaw().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveSimTracePath(path: Omit<SimTracePath, "id" | "savedAt">): SimTracePath {
  const entry: SimTracePath = {
    ...path,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...readRaw()].slice(0, MAX_PATHS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function deleteSimTracePath(id: string): void {
  const next = readRaw().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function duplicateSimTracePath(id: string): SimTracePath | null {
  const source = readRaw().find((p) => p.id === id);
  if (!source) return null;
  return saveSimTracePath({
    ...source,
    label: `${source.label} (copy)`,
  });
}

export function defaultPathLabel(
  methodName: string,
  startLine: number,
  endLine?: number,
): string {
  return endLine != null && endLine !== startLine
    ? `${methodName} L${startLine}→L${endLine}`
    : `${methodName} L${startLine}`;
}
