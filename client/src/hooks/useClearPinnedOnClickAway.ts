import { useEffect, useRef } from "react";

/** Matches React Flow `nodeDragThreshold` — movement above this is a drag, not a click. */
const DRAG_THRESHOLD_PX = 4;

const PIN_TARGET_SELECTOR =
  ".token-chip, .token-def-label, [data-token-context-bar], .preview-edge-hit";

function isPinTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(PIN_TARGET_SELECTOR));
}

/** Clears a pinned token trace when the user clicks outside token UI (not after a drag). */
export function useClearPinnedOnClickAway(
  pinned: boolean,
  onClear: () => void,
): void {
  const downRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pinned) return;

    const onPointerDown = (e: PointerEvent) => {
      downRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const down = downRef.current;
      downRef.current = null;
      if (!down) return;

      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;
      if (isPinTarget(e.target)) return;

      onClear();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onClear, pinned]);
}
