export const RECENT_FILES_STORAGE_KEY = "codegrapher-recent-files";
export const RECENT_FILES_SECTION_OPEN_KEY = "codegrapher-recent-files-section-open";
export const RECENT_FILES_CHANGED_EVENT = "codegrapher-recent-files-changed";

const MAX_RECENT_FILES = 5;

export function fileDisplayName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function loadRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_RECENT_FILES);
  } catch {
    return [];
  }
}

function saveRecentFiles(files: string[]): void {
  localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(files));
}

function notifyRecentFilesChanged(): void {
  window.dispatchEvent(new Event(RECENT_FILES_CHANGED_EVENT));
}

/** Prepend path, dedupe, cap at 5. Persists JSON to localStorage. */
export function prependRecentFile(path: string, current?: string[]): string[] {
  const trimmed = path.trim();
  if (!trimmed) return current ?? loadRecentFiles();

  const base = current ?? loadRecentFiles();
  const next = [trimmed, ...base.filter((p) => p !== trimmed)].slice(0, MAX_RECENT_FILES);
  saveRecentFiles(next);
  notifyRecentFilesChanged();
  return next;
}

export function recordRecentFile(path: string): string[] {
  return prependRecentFile(path);
}

export function clearRecentFiles(): void {
  localStorage.removeItem(RECENT_FILES_STORAGE_KEY);
  notifyRecentFilesChanged();
}

export function loadRecentSectionOpen(): boolean {
  try {
    const raw = localStorage.getItem(RECENT_FILES_SECTION_OPEN_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function saveRecentSectionOpen(open: boolean): void {
  localStorage.setItem(RECENT_FILES_SECTION_OPEN_KEY, JSON.stringify(open));
}
