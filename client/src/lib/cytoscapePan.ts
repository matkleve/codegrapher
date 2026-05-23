import type { Core, EventObject } from "cytoscape";

const DRAG_THRESHOLD_PX = 4;

export interface ViewportDragHandle {
  isTapSuppressed: () => boolean;
  clearTapSuppress: () => void;
  destroy: () => void;
}

/**
 * Left-drag pans the viewport from anywhere (nodes or background).
 * Cytoscape only pans on background by default; compound parents cover the canvas.
 */
export function setupViewportDrag(cy: Core, onPan?: () => void): ViewportDragHandle {
  let session: {
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    dragged: boolean;
  } | null = null;

  let suppressTap = false;

  const onMouseDown = (evt: EventObject) => {
    if (evt.originalEvent.button !== 0) return;
    const pan = cy.pan();
    session = {
      startClientX: evt.originalEvent.clientX,
      startClientY: evt.originalEvent.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      dragged: false,
    };
  };

  const onMouseMove = (evt: EventObject) => {
    if (!session) return;
    const dx = evt.originalEvent.clientX - session.startClientX;
    const dy = evt.originalEvent.clientY - session.startClientY;
    if (!session.dragged) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      session.dragged = true;
    }
    cy.pan({ x: session.startPanX + dx, y: session.startPanY + dy });
    onPan?.();
  };

  const endSession = () => {
    if (session?.dragged) suppressTap = true;
    session = null;
  };

  cy.on("mousedown", onMouseDown);
  cy.on("mousemove", onMouseMove);
  cy.on("mouseup", endSession);
  document.addEventListener("mouseup", endSession);

  return {
    isTapSuppressed: () => suppressTap,
    clearTapSuppress: () => {
      suppressTap = false;
    },
    destroy: () => {
      cy.removeListener("mousedown", onMouseDown);
      cy.removeListener("mousemove", onMouseMove);
      cy.removeListener("mouseup", endSession);
      document.removeEventListener("mouseup", endSession);
    },
  };
}
