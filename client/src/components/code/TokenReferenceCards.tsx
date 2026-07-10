import { Code2, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { openFileInEditor } from "@/api";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { fileDisplayName } from "@/lib/recentFiles";
import { cn } from "@/lib/utils";

const MAX_CARDS = 5;

/** Same hover / density as explorer file rows. */
const LOAD_ROW =
  "explorer-file-row hoverable control-row-compact pointer-events-auto flex w-full min-w-48 cursor-pointer items-center justify-between gap-2 overflow-visible border border-transparent font-mono text-foreground";

export function TokenReferenceCards() {
  const {
    referenceCards,
    cancelHideReferenceCards,
    scheduleHideReferenceCards,
    onLoadFile,
    setReferenceCards,
    setActiveTokenKey,
  } = useGraphInteraction();

  if (!referenceCards) return null;

  const { anchor, cards } = referenceCards;
  const visible = cards.slice(0, MAX_CARDS);
  const remaining = cards.length - visible.length;

  return createPortal(
    <div
      data-token-reference-cards
      className="pointer-events-auto fixed z-50 flex flex-col gap-0.5 rounded-md border border-border bg-card p-1 shadow-sm"
      style={{ left: anchor.left, top: anchor.bottom + 4 }}
      onMouseEnter={cancelHideReferenceCards}
      onMouseLeave={scheduleHideReferenceCards}
    >
      {visible.map((card) => {
        const key = `${card.filePath}:${card.line}`;
        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            className={cn(LOAD_ROW, "group/load relative")}
            onClick={() => {
              void onLoadFile(card.filePath);
              setReferenceCards(null);
              setActiveTokenKey(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void onLoadFile(card.filePath);
                setReferenceCards(null);
                setActiveTokenKey(null);
              }
            }}
          >
            <FlowAnchor
              side="left"
              colorClass="bg-orange-400"
              visible
              highlighted
              size="card"
            />
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Plus className="size-3 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium">
                  Load {card.symbolName}
                </span>
                <span className="truncate text-xs text-muted-foreground group-hover/load:text-muted-foreground">
                  {card.occurrenceCount} occurrence(s) in{" "}
                  {fileDisplayName(card.filePath)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="hoverable flex size-[var(--control-height-compact)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-muted-foreground"
              aria-label="Open in code editor"
              onClick={(e) => {
                e.stopPropagation();
                void openFileInEditor(card.filePath, card.line);
                setReferenceCards(null);
                setActiveTokenKey(null);
              }}
            >
              <Code2 className="size-4" aria-hidden />
            </button>
            <FlowAnchor
              side="right"
              colorClass="bg-orange-400"
              visible
              highlighted
              size="card"
            />
          </div>
        );
      })}
      {remaining > 0 ? (
        <p className="px-2 py-0.5 text-xs text-muted-foreground">
          {remaining} more references…
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
