import type { Viewport } from "@xyflow/react";

/** Small per-pixel exponent; trackpad pinches send many small deltas. */
export const GRAPH_PINCH_ZOOM_SENSITIVITY = 0.005;
/** Max zoom change per wheel event (≈1.25× per mouse-wheel tick). */
const MAX_STEP_EXPONENT = 0.32;

export function wheelDeltaToZoomFactor(deltaY: number, deltaMode: number): number {
  const modeScale = deltaMode === 1 ? 0.02 : deltaMode ? 1 : GRAPH_PINCH_ZOOM_SENSITIVITY;
  const exponent = Math.max(
    -MAX_STEP_EXPONENT,
    Math.min(MAX_STEP_EXPONENT, -deltaY * modeScale),
  );
  return Math.pow(2, exponent);
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
