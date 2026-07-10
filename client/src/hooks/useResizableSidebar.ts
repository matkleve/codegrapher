import { useCallback, useRef, useState } from "react";
import {
  clampSidebarDragWidth,
  clampSidebarWidth,
  isSidebarCollapseWarning,
  loadStoredSidebarCollapsed,
  loadStoredSidebarWidth,
  saveStoredSidebarCollapsed,
  saveStoredSidebarWidth,
  shouldSidebarCollapseOnRelease,
  SIDEBAR_DEFAULT_WIDTH,
} from "@/lib/sidebarLayout";

export type ResizableSidebarState = {
  width: number;
  collapsed: boolean;
  isResizing: boolean;
  collapseWarning: boolean;
  toggleCollapsed: () => void;
  onResizeMouseDown: (event: React.MouseEvent) => void;
  onResizeDoubleClick: () => void;
};

export function useResizableSidebar(): ResizableSidebarState {
  const [width, setWidth] = useState(loadStoredSidebarWidth);
  const [collapsed, setCollapsed] = useState(loadStoredSidebarCollapsed);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveStoredSidebarCollapsed(next);
      return next;
    });
  }, []);

  const onResizeDoubleClick = useCallback(() => {
    const next = SIDEBAR_DEFAULT_WIDTH;
    widthRef.current = next;
    setWidth(next);
    saveStoredSidebarWidth(next);
  }, []);

  const onResizeMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = widthRef.current;
    setIsResizing(true);

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = clampSidebarDragWidth(startWidth + delta);
      widthRef.current = next;
      setWidth(next);
    };

    const onUp = () => {
      setIsResizing(false);
      const releasedWidth = widthRef.current;
      if (shouldSidebarCollapseOnRelease(releasedWidth)) {
        const restoreWidth = clampSidebarWidth(startWidth);
        widthRef.current = restoreWidth;
        setWidth(restoreWidth);
        setCollapsed(true);
        saveStoredSidebarCollapsed(true);
      } else {
        const snapped = clampSidebarWidth(releasedWidth);
        widthRef.current = snapped;
        setWidth(snapped);
        saveStoredSidebarWidth(snapped);
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
  }, []);

  return {
    width,
    collapsed,
    isResizing,
    collapseWarning: isResizing && isSidebarCollapseWarning(width),
    toggleCollapsed,
    onResizeMouseDown,
    onResizeDoubleClick,
  };
}
