export const RECENT_FOLDERS_STORAGE_KEY = "codegrapher-recent-folders";
const MAX_RECENT_FOLDERS = 5;

export function folderDisplayName(path: string): string {
  const normalized = path.replace(/[/\\]+$/, "");
  const parts = normalized.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function loadRecentFolders(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_RECENT_FOLDERS);
  } catch {
    return [];
  }
}

function saveRecentFolders(folders: string[]): void {
  localStorage.setItem(RECENT_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

/** Prepend path, dedupe, cap at 5. Persists JSON to localStorage. */
export function prependRecentFolder(path: string, current: string[]): string[] {
  const trimmed = path.trim();
  if (!trimmed) return current;

  const next = [trimmed, ...current.filter((p) => p !== trimmed)].slice(
    0,
    MAX_RECENT_FOLDERS,
  );
  saveRecentFolders(next);
  return next;
}

/** Same as prepend but reads/writes storage directly. */
export function recordRecentFolder(path: string): string[] {
  return prependRecentFolder(path, loadRecentFolders());
}

export function clearRecentFolders(): void {
  localStorage.removeItem(RECENT_FOLDERS_STORAGE_KEY);
}
