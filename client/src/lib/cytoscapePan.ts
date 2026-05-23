import type { Core } from "cytoscape";
import type { PointerEvent, RefObject, WheelEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

type PanSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
  dragging: boolean;
};

/** DOM-level pan/zoom so the map works even when Cytoscape canvases miss pointer events. */
export function createGraphPaneHandlers(
  graphPaneRef: RefObject<HTMLElement | null>,
  cyRef: RefObject<Core | null>,
  sessionRef: RefObject<PanSession | null>,
  onViewportChange?: () => void,
) {
  const syncGrid = () => onViewportChange?.();

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest("[data-graph-control]")) return;

    const cy = cyRef.current;
    if (!cy) return;

    const pan = cy.pan();
    sessionRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      dragging: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    const cy = cyRef.current;
    const pane = graphPaneRef.current;
    if (!session || !cy || !pane || e.pointerId !== session.pointerId) return;

    const dx = e.clientX - session.startClientX;
    const dy = e.clientY - session.startClientY;

    if (!session.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      session.dragging = true;
      pane.setPointerCapture(e.pointerId);
      pane.style.cursor = "grabbing";
    }

    cy.pan({ x: session.startPanX + dx, y: session.startPanY + dy });
    syncGrid();
  };

  const endPointer = (e: PointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    const pane = graphPaneRef.current;
    if (!session || e.pointerId !== session.pointerId) return;

    if (pane?.hasPointerCapture(e.pointerId)) {
      pane.releasePointerCapture(e.pointerId);
    }
    pane && (pane.style.cursor = "");
    sessionRef.current = null;
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const cy = cyRef.current;
    const pane = graphPaneRef.current;
    if (!cy || !pane) return;

    e.preventDefault();
    const rect = pane.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const nextZoom = Math.min(4, Math.max(0.2, cy.zoom() * factor));
    cy.zoom({ level: nextZoom, renderedPosition: { x, y } });
    syncGrid();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onWheel,
    isPanDragging: () => sessionRef.current?.dragging ?? false,
  };
}
