import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useJumpTooltip } from "@/context/JumpTooltipContext";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

const PAD = 14;
const VIEWPORT_MARGIN = 6;

export function JumpTooltip() {
  const { jumpTooltip } = useJumpTooltip();
  const tipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!jumpTooltip || !tipRef.current) {
      setPosition(null);
      return;
    }

    const { x, y } = jumpTooltip;
    const { width, height } = tipRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = x + PAD;
    let top = y + PAD;
    if (left + width > viewportW - VIEWPORT_MARGIN) {
      left = x - width - PAD;
    }
    if (top + height > viewportH - VIEWPORT_MARGIN) {
      top = y - height - PAD;
    }

    setPosition({
      left: Math.max(VIEWPORT_MARGIN, left),
      top: Math.max(VIEWPORT_MARGIN, top),
    });
  }, [jumpTooltip]);

  if (!jumpTooltip) return null;

  const { token, kind } = jumpTooltip;

  return createPortal(
    <div
      ref={tipRef}
      className="jump-tip pointer-events-none fixed z-[60] flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2 py-1 text-caption font-medium text-foreground shadow-md"
      style={
        position
          ? { left: position.left, top: position.top, visibility: "visible" }
          : { left: jumpTooltip.x + PAD, top: jumpTooltip.y + PAD, visibility: "hidden" }
      }
    >
      <span className="font-bold text-brand">↳</span>
      <span>Jump to</span>
      <span
        className="size-2 rounded-sm"
        style={{ background: TOKEN_EDGE_STROKE[kind] }}
        aria-hidden
      />
      <b>{token}</b>
      <span className="font-mono text-2xs text-muted-foreground">{kind}</span>
    </div>,
    document.body,
  );
}
