/** Last successfully opened folder (restored on next visit). */
export const LAST_FOLDER_STORAGE_KEY = "codegrapher-last-folder";

/** Last successfully opened file graph (restored on next visit). */
export const LAST_FILE_STORAGE_KEY = "codegrapher-last-file";

export function saveLastFolder(path: string): void {
  const trimmed = path.trim();
  if (!trimmed) return;
  localStorage.setItem(LAST_FOLDER_STORAGE_KEY, JSON.stringify(trimmed));
}

export function loadLastFolder(): string | null {
  try {
    const raw = localStorage.getItem(LAST_FOLDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "string" && parsed.trim() ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLastFile(path: string): void {
  const trimmed = path.trim();
  if (!trimmed) return;
  localStorage.setItem(LAST_FILE_STORAGE_KEY, JSON.stringify(trimmed));
}

export function loadLastFile(): string | null {
  try {
    const raw = localStorage.getItem(LAST_FILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "string" && parsed.trim() ? parsed : null;
  } catch {
    return null;
  }
}

const RESTORED_FOLDER_SESSION_KEY = "codegrapher-restored-folder";
const RESTORED_FILE_SESSION_KEY = "codegrapher-restored-file";

export function shouldRestoreFolder(): boolean {
  if (sessionStorage.getItem(RESTORED_FOLDER_SESSION_KEY)) return false;
  sessionStorage.setItem(RESTORED_FOLDER_SESSION_KEY, "1");
  return true;
}

export function shouldRestoreFile(): boolean {
  if (sessionStorage.getItem(RESTORED_FILE_SESSION_KEY)) return false;
  sessionStorage.setItem(RESTORED_FILE_SESSION_KEY, "1");
  return true;
}
