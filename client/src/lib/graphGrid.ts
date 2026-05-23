export const GRAPH_GRID_STORAGE_KEY = "codegrapher-show-grid";
export const GRAPH_GRID_CELL_PX = 24;

export function loadShowGrid(): boolean {
  try {
    const raw = localStorage.getItem(GRAPH_GRID_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function saveShowGrid(show: boolean): void {
  localStorage.setItem(GRAPH_GRID_STORAGE_KEY, JSON.stringify(show));
}

/** Keep grid lines aligned with React Flow pan/zoom. */
export function syncGridToViewport(
  viewport: { x: number; y: number; zoom: number },
  gridEl: HTMLElement,
): void {
  const { x, y, zoom } = viewport;
  const size = GRAPH_GRID_CELL_PX * zoom;
  gridEl.style.backgroundSize = `${size}px ${size}px`;
  gridEl.style.backgroundPosition = `${x}px ${y}px`;
}
