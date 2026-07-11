import { useRef } from "react";
import { createPortal } from "react-dom";
import { useJumpTooltip } from "@/context/JumpTooltipContext";
import { useViewportAnchoredPosition } from "@/hooks/useViewportAnchoredPosition";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

const CURSOR_PAD = 14;

export function JumpTooltip() {
  const { jumpTooltip } = useJumpTooltip();
  const tipRef = useRef<HTMLDivElement>(null);

  const position = useViewportAnchoredPosition(
    tipRef,
    jumpTooltip ? { x: jumpTooltip.x, y: jumpTooltip.y } : null,
    { mode: "cursor", pad: CURSOR_PAD, viewportMargin: 6 },
  );

  if (!jumpTooltip) return null;

  const { token, kind } = jumpTooltip;

  return createPortal(
    <div
      ref={tipRef}
      className="jump-tip pointer-events-none fixed z-[60] flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2 py-1 text-caption font-medium text-foreground shadow-md"
      style={
        position
          ? { left: position.left, top: position.top, visibility: "visible" }
          : {
              left: jumpTooltip.x + CURSOR_PAD,
              top: jumpTooltip.y + CURSOR_PAD,
              visibility: "hidden",
            }
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
