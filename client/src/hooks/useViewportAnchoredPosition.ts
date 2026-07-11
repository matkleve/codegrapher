import { type RefObject, useLayoutEffect, useState } from "react";

export const DEFAULT_VIEWPORT_MARGIN = 8;

export type ViewportPoint = { x: number; y: number };

/** Center horizontally below anchor; flip above when clipped. */
export type PanelAnchorStrategy = {
  mode: "panel";
  gapBelow?: number;
  gapAbove?: number;
  centerX?: boolean;
  viewportMargin?: number;
};

/** Offset from cursor; flip left/up when clipped. */
export type CursorAnchorStrategy = {
  mode: "cursor";
  pad?: number;
  viewportMargin?: number;
};

export type ViewportAnchorStrategy = PanelAnchorStrategy | CursorAnchorStrategy;

export function useViewportAnchoredPosition(
  panelRef: RefObject<HTMLElement | null>,
  anchor: ViewportPoint | null | undefined,
  strategy: ViewportAnchorStrategy,
): { left: number; top: number } | null {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const anchorX = anchor?.x;
  const anchorY = anchor?.y;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (anchorX == null || anchorY == null || !panel) {
      setPosition(null);
      return;
    }

    const { width, height } = panel.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    if (strategy.mode === "panel") {
      const margin = strategy.viewportMargin ?? DEFAULT_VIEWPORT_MARGIN;
      const gapBelow = strategy.gapBelow ?? 6;
      const gapAbove = strategy.gapAbove ?? gapBelow;
      const centerX = strategy.centerX !== false;

      let left = centerX ? anchorX - width / 2 : anchorX;
      let top = anchorY + gapBelow;

      if (left + width > viewportW - margin) {
        left = viewportW - width - margin;
      }
      if (left < margin) left = margin;

      if (top + height > viewportH - margin) {
        top = anchorY - height - gapAbove;
      }
      if (top < margin) top = margin;

      setPosition({ left, top });
      return;
    }

    const pad = strategy.pad ?? 14;
    const margin = strategy.viewportMargin ?? 6;

    let left = anchorX + pad;
    let top = anchorY + pad;
    if (left + width > viewportW - margin) {
      left = anchorX - width - pad;
    }
    if (top + height > viewportH - margin) {
      top = anchorY - height - pad;
    }

    setPosition({
      left: Math.max(margin, left),
      top: Math.max(margin, top),
    });
  }, [
    anchorX,
    anchorY,
    panelRef,
    strategy.mode,
    strategy.mode === "panel" ? strategy.gapBelow : strategy.pad,
    strategy.mode === "panel" ? strategy.gapAbove : undefined,
    strategy.mode === "panel" ? strategy.centerX : undefined,
    strategy.viewportMargin,
  ]);

  return position;
}
