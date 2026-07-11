export const SIM_PANEL_WIDTH_STORAGE_KEY = "codegrapher:sim-panel-width";

export const SIM_PANEL_DEFAULT_WIDTH = 256;
export const SIM_PANEL_MIN_WIDTH = 200;
export const SIM_PANEL_MAX_WIDTH = 480;
export const SIM_PANEL_COLLAPSE_WARN_WIDTH = 160;
export const SIM_PANEL_COLLAPSE_THRESHOLD = 120;

function clampWidth(width: number): number {
  return Math.min(SIM_PANEL_MAX_WIDTH, Math.max(SIM_PANEL_MIN_WIDTH, width));
}

/** During drag, allow narrowing below min width to signal collapse. */
export function clampSimPanelDragWidth(width: number): number {
  return Math.min(SIM_PANEL_MAX_WIDTH, Math.max(80, width));
}

export function isSimPanelCollapseWarning(width: number): boolean {
  return width < SIM_PANEL_COLLAPSE_WARN_WIDTH;
}

export function shouldSimPanelCollapseOnRelease(width: number): boolean {
  return width < SIM_PANEL_COLLAPSE_THRESHOLD;
}

export function loadStoredSimPanelWidth(): number {
  try {
    const raw = localStorage.getItem(SIM_PANEL_WIDTH_STORAGE_KEY);
    if (!raw) return SIM_PANEL_DEFAULT_WIDTH;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return SIM_PANEL_DEFAULT_WIDTH;
    return clampWidth(parsed);
  } catch {
    return SIM_PANEL_DEFAULT_WIDTH;
  }
}

export function saveStoredSimPanelWidth(width: number): void {
  try {
    localStorage.setItem(SIM_PANEL_WIDTH_STORAGE_KEY, String(clampWidth(width)));
  } catch {
    // best effort
  }
}

export { clampWidth as clampSimPanelWidth };
