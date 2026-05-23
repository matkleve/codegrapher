import type { Viewport } from "@xyflow/react";

/** ~10× default XYFlow wheel delta on non-macOS; matches pre–pan-on-scroll feel. */
export const GRAPH_PINCH_ZOOM_SENSITIVITY = 0.02;

export function wheelDeltaToZoomFactor(deltaY: number, deltaMode: number): number {
  const modeScale = deltaMode === 1 ? 0.05 : deltaMode ? 1 : GRAPH_PINCH_ZOOM_SENSITIVITY;
  return Math.pow(2, -deltaY * modeScale);
}

export function viewportZoomedAtPointer(
  viewport: Viewport,
  pointerX: number,
  pointerY: number,
  nextZoom: number,
): Viewport {
  const ratio = nextZoom / viewport.zoom;
  return {
    zoom: nextZoom,
    x: pointerX - (pointerX - viewport.x) * ratio,
    y: pointerY - (pointerY - viewport.y) * ratio,
  };
}

export function isGraphZoomWheel(event: WheelEvent): boolean {
  return event.ctrlKey || event.metaKey;
}
