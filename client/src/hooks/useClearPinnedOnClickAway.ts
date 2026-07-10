import { useEffect, useRef } from "react";

/** Matches React Flow `nodeDragThreshold` — movement above this is a drag, not a click. */
const DRAG_THRESHOLD_PX = 4;

const PIN_TARGET_SELECTOR =
  ".token-chip, .token-def-label, [data-token-context-bar], .preview-edge-hit, .connector-chip--load";

function isPinTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(PIN_TARGET_SELECTOR));
}

/** A pointerup within this long after a window `focus` event is treated as the click that caused the refocus, not a deliberate click-away. */
const REFOCUS_GRACE_MS = 500;

/** Clears a pinned token trace when the user clicks outside token UI (not after a drag, and not the click that just refocused the window). */
export function useClearPinnedOnClickAway(
  pinned: boolean,
  onClear: () => void,
): void {
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const ignoreNextRef = useRef(false);
  const ignoreTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pinned) return;

    const onWindowFocus = () => {
      ignoreNextRef.current = true;
      if (ignoreTimeoutRef.current != null) {
        window.clearTimeout(ignoreTimeoutRef.current);
      }
      ignoreTimeoutRef.current = window.setTimeout(() => {
        ignoreNextRef.current = false;
      }, REFOCUS_GRACE_MS);
    };

    const onPointerDown = (e: PointerEvent) => {
      downRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const down = downRef.current;
      downRef.current = null;
      const wasRefocusClick = ignoreNextRef.current;
      ignoreNextRef.current = false;
      if (!down) return;
      if (wasRefocusClick) return;

      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;
      if (isPinTarget(e.target)) return;

      onClear();
    };

    // Capture phase: several in-card controls (member rows, chips, bulk
    // toggles) call stopPropagation() on pointerdown/up so their own click
    // isn't mistaken for a node drag. That stops those events from ever
    // bubbling up to a window listener, so a capture-phase listener (which
    // runs top-down, before any handler downstream can stop it) is the only
    // way to reliably detect "clicked somewhere that isn't the pin itself".
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    return () => {
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
      if (ignoreTimeoutRef.current != null) {
        window.clearTimeout(ignoreTimeoutRef.current);
      }
    };
  }, [onClear, pinned]);
}
