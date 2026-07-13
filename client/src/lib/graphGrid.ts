export const GRAPH_GRID_STORAGE_KEY = "codegrapher-show-grid";
export const GRAPH_GRID_CELL_PX = 24;
/** Major accent every N fine cells (240px in flow space at default). */
export const GRAPH_GRID_MAJOR_FACTOR = 10;
/** Minimum on-screen spacing between dots; below this we subsample the grid. */
export const GRAPH_GRID_MIN_DOT_SCREEN_PX = 14;
export const GRAPH_GRID_MAX_LOD_FACTOR = 8;
export const GRAPH_GRID_FINE_FADE_START_ZOOM = 0.55;
export const GRAPH_GRID_FINE_FADE_END_ZOOM = 0.85;

/** Power-of-two subsample so coarser grids stay aligned to the 24px flow lattice. */
export function getGridLodFactor(zoom: number): number {
  const baseScreenPx = GRAPH_GRID_CELL_PX * zoom;
  if (baseScreenPx >= GRAPH_GRID_MIN_DOT_SCREEN_PX) return 1;
  const needed = Math.ceil(GRAPH_GRID_MIN_DOT_SCREEN_PX / baseScreenPx);
  const powerOfTwo = 1 << Math.ceil(Math.log2(needed));
  return Math.min(GRAPH_GRID_MAX_LOD_FACTOR, powerOfTwo);
}

/** Full-resolution fine dots fade in when zoomed in but the primary grid is still subsampled. */
export function getFineGridOpacity(zoom: number, lod: number): number {
  if (lod <= 1) return 0;
  if (zoom <= GRAPH_GRID_FINE_FADE_START_ZOOM) return 0;
  if (zoom >= GRAPH_GRID_FINE_FADE_END_ZOOM) return 1;
  return (
    (zoom - GRAPH_GRID_FINE_FADE_START_ZOOM) /
    (GRAPH_GRID_FINE_FADE_END_ZOOM - GRAPH_GRID_FINE_FADE_START_ZOOM)
  );
}

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

/** Keep dot grid aligned with React Flow pan/zoom. */
export function syncGridToViewport(
  viewport: { x: number; y: number; zoom: number },
  gridEl: HTMLElement,
): void {
  const { x, y, zoom } = viewport;
  const lod = getGridLodFactor(zoom);
  const majorSize = GRAPH_GRID_CELL_PX * GRAPH_GRID_MAJOR_FACTOR * zoom;
  const minorSize = GRAPH_GRID_CELL_PX * lod * zoom;
  const fineSize = GRAPH_GRID_CELL_PX * zoom;
  const pos = `${x}px ${y}px`;

  gridEl.style.backgroundSize = `${majorSize}px ${majorSize}px, ${minorSize}px ${minorSize}px`;
  gridEl.style.backgroundPosition = `${pos}, ${pos}`;
  gridEl.style.setProperty("--grid-fine-size", `${fineSize}px`);
  gridEl.style.setProperty("--grid-fine-position", pos);
  gridEl.style.setProperty("--grid-fine-opacity", String(getFineGridOpacity(zoom, lod)));
}
