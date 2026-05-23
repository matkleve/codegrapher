import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  isGraphZoomWheel,
  viewportZoomedAtPointer,
  wheelDeltaToZoomFactor,
} from "@/lib/graphPinchZoom";

const GRAPH_PANE_SELECTOR = ".graph-flow-container .react-flow__pane";
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export function GraphPinchZoomBoost() {
  const { getViewport, setViewport } = useReactFlow();

  useEffect(() => {
    const pane = document.querySelector(GRAPH_PANE_SELECTOR);
    if (!pane) return;

    const onWheel = (event: WheelEvent) => {
      if (!isGraphZoomWheel(event)) return;
      if ((event.target as Element | null)?.closest(".nowheel")) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const rect = pane.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const viewport = getViewport();
      const factor = wheelDeltaToZoomFactor(event.deltaY, event.deltaMode);
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));

      setViewport(
        viewportZoomedAtPointer(viewport, pointerX, pointerY, nextZoom),
        { duration: 0 },
      );
    };

    pane.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => pane.removeEventListener("wheel", onWheel, { capture: true });
  }, [getViewport, setViewport]);

  return null;
}
