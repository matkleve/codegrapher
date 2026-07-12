import { useRef } from "react";
import { createPortal } from "react-dom";
import {
  useJumpTooltip,
  type JumpChoice,
} from "@/context/JumpTooltipContext";
import { useViewportAnchoredPosition } from "@/hooks/useViewportAnchoredPosition";
import { useJumpTooltipAction } from "@/hooks/useJumpTooltipAction";
import {
  InteractiveListRow,
  SemanticConnectionDot,
} from "@/components/ui/InteractiveListRow";

const CURSOR_PAD = 14;

function JumpChoiceRow({
  choice,
  onPick,
}: {
  choice: JumpChoice;
  onPick: () => void;
}) {
  return (
    <InteractiveListRow
      density="plain"
      title={choice.label}
      className="text-caption font-medium"
      leading={
        <>
          <span className="font-bold text-brand" aria-hidden>
            ↳
          </span>
          <span>Jump to</span>
          <SemanticConnectionDot kind={choice.kind} />
        </>
      }
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    />
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
      className="jump-tip pointer-events-auto fixed z-[60] flex flex-col gap-0.5 rounded-lg border border-border bg-card px-1 py-1 text-caption shadow-md"
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
        <JumpChoiceRow
          choice={single}
          onPick={() => onJump(wireId, single.wireEnd)}
        />
      ) : null}
      {mode === "choice" && choices?.map((choice) => (
        <JumpChoiceRow
          key={choice.wireEnd}
          choice={choice}
          onPick={() => onJump(wireId, choice.wireEnd)}
        />
      ))}
    </div>,
    document.body,
  );
}
