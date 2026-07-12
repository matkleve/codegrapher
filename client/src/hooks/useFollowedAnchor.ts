import { useEffect, useRef, useState } from "react";

export type FollowedAnchorPoint = { x: number; y: number };

/**
 * Re-measures `anchorEl` every animation frame so a portaled panel tracks it
 * through canvas pan/zoom and container scroll — those move the element via
 * CSS transform / scrollTop, neither of which fires a `scroll` event, so a
 * one-time `getBoundingClientRect()` snapshot goes stale as soon as the view
 * moves. Calls `onDetached` (e.g. to close the panel) once the element leaves
 * the DOM.
 */
export function useFollowedAnchor(
  anchorEl: HTMLElement | null | undefined,
  measure: (el: HTMLElement) => FollowedAnchorPoint,
  onDetached: () => void,
): FollowedAnchorPoint | null {
  const [point, setPoint] = useState<FollowedAnchorPoint | null>(null);
  const measureRef = useRef(measure);
  measureRef.current = measure;
  const onDetachedRef = useRef(onDetached);
  onDetachedRef.current = onDetached;

  useEffect(() => {
    if (!anchorEl) {
      setPoint(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      if (!anchorEl.isConnected) {
        onDetachedRef.current();
        return;
      }
      setPoint(measureRef.current(anchorEl));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchorEl]);

  return point;
}
