import { Code2, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { openFileInEditor } from "@/api";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { fileDisplayName } from "@/lib/recentFiles";
import { cn } from "@/lib/utils";

const MAX_CARDS = 5;

export function TokenReferenceCards() {
  const {
    referenceCards,
    cancelHideReferenceCards,
    scheduleHideReferenceCards,
    onLoadFile,
    setReferenceCards,
    clearPreviewForKey,
  } = useGraphInteraction();

  if (!referenceCards) return null;

  const { token, x, y, cards } = referenceCards;
  const visible = cards.slice(0, MAX_CARDS);
  const remaining = cards.length - visible.length;

  return createPortal(
    <div
      data-token-reference-cards
      className="pointer-events-auto fixed z-50 flex flex-col gap-2"
      style={{ left: x, top: y + 4 }}
      onMouseEnter={cancelHideReferenceCards}
      onMouseLeave={scheduleHideReferenceCards}
    >
      {visible.map((card) => (
        <div
          key={`${card.filePath}-${card.line}`}
          role="button"
          tabIndex={0}
          className={cn(
            "flex min-w-48 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm",
            "hover:bg-accent",
          )}
          onClick={() => {
            void onLoadFile(card.filePath);
            setReferenceCards(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void onLoadFile(card.filePath);
              setReferenceCards(null);
            }
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Plus className="size-3 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                Load {card.symbolName}
              </span>
              <span className="text-xs text-muted-foreground">
                {card.occurrenceCount} occurrence(s) in {fileDisplayName(card.filePath)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-primary"
            aria-label="Open in VS Code"
            onClick={(e) => {
              e.stopPropagation();
              void openFileInEditor(card.filePath, card.line);
              setReferenceCards(null);
            }}
          >
            <Code2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      {remaining > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">{remaining} more references…</p>
      ) : null}
    </div>,
    document.body,
  );
}
