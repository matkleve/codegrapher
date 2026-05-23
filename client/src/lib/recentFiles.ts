export const RECENT_FILES_STORAGE_KEY = "codegrapher-recent-files-by-folder";
export const RECENT_FILES_SECTION_OPEN_KEY = "codegrapher-recent-files-section-open";
export const RECENT_FILES_CHANGED_EVENT = "codegrapher-recent-files-changed";

/** @deprecated Migrated to per-folder storage */
const LEGACY_RECENT_FILES_KEY = "codegrapher-recent-files";

const MAX_RECENT_FILES = 5;

let activeFolderRoot: string | null = null;

type RecentFilesByFolder = Record<string, string[]>;

export function fileDisplayName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function setActiveFolderRoot(folderPath: string | null): void {
  activeFolderRoot = folderPath?.trim() ? folderPath.trim() : null;
}

export function getActiveFolderRoot(): string | null {
  return activeFolderRoot;
}

function loadStore(): RecentFilesByFolder {
  try {
    const raw = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
    if (!raw) {
      migrateLegacyRecentFiles();
      return loadStore();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: RecentFilesByFolder = {};
    for (const [folder, files] of Object.entries(parsed)) {
      if (!Array.isArray(files)) continue;
      store[folder] = files
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, MAX_RECENT_FILES);
    }
    return store;
  } catch {
    return {};
  }
}

function saveStore(store: RecentFilesByFolder): void {
  localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(store));
}

function migrateLegacyRecentFiles(): void {
  try {
    const raw = localStorage.getItem(LEGACY_RECENT_FILES_KEY);
    if (!raw) return;
    localStorage.removeItem(LEGACY_RECENT_FILES_KEY);
  } catch {
    /* ignore */
  }
}

function notifyRecentFilesChanged(): void {
  window.dispatchEvent(new Event(RECENT_FILES_CHANGED_EVENT));
}

/** Recent files for the active folder only (empty when no folder is open). */
export function loadRecentFiles(folderRoot?: string | null): string[] {
  const root = folderRoot ?? activeFolderRoot;
  if (!root) return [];
  return loadStore()[root] ?? [];
}

export function prependRecentFile(
  path: string,
  current?: string[],
  folderRoot?: string | null,
): string[] {
  const trimmed = path.trim();
  const root = folderRoot ?? activeFolderRoot;
  if (!trimmed || !root) return current ?? [];

  const base = current ?? loadRecentFiles(root);
  const next = [trimmed, ...base.filter((p) => p !== trimmed)].slice(0, MAX_RECENT_FILES);

  const store = loadStore();
  store[root] = next;
  saveStore(store);
  notifyRecentFilesChanged();
  return next;
}

export function recordRecentFile(path: string, folderRoot?: string | null): string[] {
  return prependRecentFile(path, undefined, folderRoot);
}

export function clearRecentFiles(folderRoot?: string | null): void {
  const root = folderRoot ?? activeFolderRoot;
  if (!root) return;
  const store = loadStore();
  delete store[root];
  saveStore(store);
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
