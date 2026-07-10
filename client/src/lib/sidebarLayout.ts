export const SIDEBAR_WIDTH_STORAGE_KEY = "codegrapher:sidebar-width";
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "codegrapher:sidebar-collapsed";

export const SIDEBAR_DEFAULT_WIDTH = 320;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 480;
export const SIDEBAR_COLLAPSED_WIDTH = 48;
/** Below this width while dragging, show the collapse warning overlay. */
export const SIDEBAR_COLLAPSE_WARN_WIDTH = 160;
/** Release below this width (after drag) to collapse the sidebar. */
export const SIDEBAR_COLLAPSE_THRESHOLD = 120;

function clampWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

/** During drag, allow narrowing past min width down to collapsed rail width. */
export function clampSidebarDragWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_COLLAPSED_WIDTH, width));
}

export function isSidebarCollapseWarning(width: number): boolean {
  return width < SIDEBAR_COLLAPSE_WARN_WIDTH;
}

export function shouldSidebarCollapseOnRelease(width: number): boolean {
  return width < SIDEBAR_COLLAPSE_THRESHOLD;
}

export function loadStoredSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (!raw) return SIDEBAR_DEFAULT_WIDTH;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return SIDEBAR_DEFAULT_WIDTH;
    return clampWidth(parsed);
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

export function saveStoredSidebarWidth(width: number): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampWidth(width)));
  } catch {
    // best effort
  }
}

export function loadStoredSidebarCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // fall through
  }
  return false;
}

export function saveStoredSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // best effort
  }
}

export { clampWidth as clampSidebarWidth };
