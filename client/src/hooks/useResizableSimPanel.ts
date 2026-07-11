import { useCallback, useRef, useState } from "react";
import {
  clampSimPanelDragWidth,
  clampSimPanelWidth,
  isSimPanelCollapseWarning,
  loadStoredSimPanelWidth,
  saveStoredSimPanelWidth,
  shouldSimPanelCollapseOnRelease,
  SIM_PANEL_DEFAULT_WIDTH,
} from "@/lib/simPanelLayout";

export type ResizableSimPanelState = {
  width: number;
  isResizing: boolean;
  collapseWarning: boolean;
  onResizeMouseDown: (event: React.MouseEvent) => void;
  onResizeDoubleClick: () => void;
};

export function useResizableSimPanel(onCollapse: () => void): ResizableSimPanelState {
  const [width, setWidth] = useState(loadStoredSimPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const onResizeDoubleClick = useCallback(() => {
    const next = SIM_PANEL_DEFAULT_WIDTH;
    widthRef.current = next;
    setWidth(next);
    saveStoredSimPanelWidth(next);
  }, []);

  const onResizeMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();

      const startX = event.clientX;
      const startWidth = widthRef.current;
      setIsResizing(true);

      const onMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const next = clampSimPanelDragWidth(startWidth + delta);
        widthRef.current = next;
        setWidth(next);
      };

      const onUp = () => {
        setIsResizing(false);
        const releasedWidth = widthRef.current;
        if (shouldSimPanelCollapseOnRelease(releasedWidth)) {
          const restoreWidth = clampSimPanelWidth(startWidth);
          widthRef.current = restoreWidth;
          setWidth(restoreWidth);
          saveStoredSimPanelWidth(restoreWidth);
          onCollapse();
        } else {
          const snapped = clampSimPanelWidth(releasedWidth);
          widthRef.current = snapped;
          setWidth(snapped);
          saveStoredSimPanelWidth(snapped);
        }
        document.body.style.cursor = "";
        document.body.style.removeProperty("user-select");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onCollapse],
  );

  return {
    width,
    isResizing,
    collapseWarning: isResizing && isSimPanelCollapseWarning(width),
    onResizeMouseDown,
    onResizeDoubleClick,
  };
}
