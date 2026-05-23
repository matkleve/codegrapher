import { useCallback, useRef } from "react";
import { Code2, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { FlowAnchor } from "@/components/code/FlowAnchor";
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
    setActiveTokenKey,
  } = useGraphInteraction();

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const getCardElement = useCallback((key: string) => cardRefs.current.get(key) ?? null, []);

  if (!referenceCards) return null;

  const { anchor, cards } = referenceCards;
  const visible = cards.slice(0, MAX_CARDS);
  const remaining = cards.length - visible.length;

  return createPortal(
    <div
      data-token-reference-cards
      className="pointer-events-auto fixed z-50 flex flex-col gap-2"
      style={{ left: anchor.left, top: anchor.bottom + 4 }}
      onMouseEnter={cancelHideReferenceCards}
      onMouseLeave={scheduleHideReferenceCards}
    >
      {visible.map((card) => {
        const key = `${card.filePath}:${card.line}`;
        return (
          <div
            key={key}
            ref={(el) => {
              if (el) cardRefs.current.set(key, el);
              else cardRefs.current.delete(key);
            }}
            role="button"
            tabIndex={0}
            className={cn(
              "relative flex min-w-48 cursor-pointer items-center justify-between gap-3 overflow-visible rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm",
              "hover:bg-accent",
            )}
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
              size="node"
            />
            <div className="flex min-w-0 items-center gap-2">
              <Plus className="size-3 shrink-0 text-primary" aria-hidden />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  Load {card.symbolName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {card.occurrenceCount} occurrence(s) in{" "}
                  {fileDisplayName(card.filePath)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-primary"
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
              size="node"
            />
          </div>
        );
      })}
      {remaining > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {remaining} more references…
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
