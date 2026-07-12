import { useRef } from "react";
import { createPortal } from "react-dom";
import {
  useJumpTooltip,
  type JumpChoice,
} from "@/context/JumpTooltipContext";
import { useViewportAnchoredPosition } from "@/hooks/useViewportAnchoredPosition";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

const CURSOR_PAD = 14;

import { useJumpTooltipAction } from "@/hooks/useJumpTooltipAction";

function ChoiceRow({
  choice,
  onPick,
}: {
  choice: JumpChoice;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-caption hover:bg-muted"
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      <span className="font-bold text-brand">↳</span>
      <span>Jump to</span>
      <span
        className="size-2 shrink-0 rounded-sm"
        style={{ background: TOKEN_EDGE_STROKE[choice.kind] }}
        aria-hidden
      />
      <b className="truncate">{choice.label}</b>
    </button>
  );
}

export function JumpTooltip() {
  const { jumpTooltip } = useJumpTooltip();
  const onJump = useJumpTooltipAction();
  const tipRef = useRef<HTMLDivElement>(null);

  const position = useViewportAnchoredPosition(
    tipRef,
    jumpTooltip ? { x: jumpTooltip.x, y: jumpTooltip.y } : null,
    { mode: "cursor", pad: CURSOR_PAD, viewportMargin: 6 },
  );

  if (!jumpTooltip) return null;

  const { wireId, mode, single, choices } = jumpTooltip;

  return createPortal(
    <div
      ref={tipRef}
      className="jump-tip pointer-events-auto fixed z-[60] flex flex-col gap-0.5 rounded-lg border border-border bg-card px-1 py-1 text-caption font-medium text-foreground shadow-md"
      style={
        position
          ? { left: position.left, top: position.top, visibility: "visible" }
          : {
              left: jumpTooltip.x + CURSOR_PAD,
              top: jumpTooltip.y + CURSOR_PAD,
              visibility: "hidden",
            }
      }
      onMouseDown={(e) => e.stopPropagation()}
    >
      {mode === "single" && single ? (
        <button
          type="button"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onJump(wireId, single.wireEnd);
          }}
        >
          <span className="font-bold text-brand">↳</span>
          <span>Jump to</span>
          <span
            className="size-2 rounded-sm"
            style={{ background: TOKEN_EDGE_STROKE[single.kind] }}
            aria-hidden
          />
          <b>{single.label}</b>
        </button>
      ) : null}
      {mode === "choice" && choices?.map((choice) => (
        <ChoiceRow
          key={choice.wireEnd}
          choice={choice}
          onPick={() => onJump(wireId, choice.wireEnd)}
        />
      ))}
    </div>,
    document.body,
  );
}
