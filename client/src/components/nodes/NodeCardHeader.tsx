import { useCallback, useRef, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { INTERACTIVE_BORDER_BTN, INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { toAnchorRect, useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildDefinitionFanOutEdges } from "@/lib/buildPreviewEdges";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeClassDefKey } from "@/lib/traceKeys";
import { cn } from "@/lib/utils";

type NodeCardHeaderProps = {
  title: string;
  symbolName?: string;
  chip?: ReactNode;
  bodyExpanded: boolean;
  onToggleCollapsed: () => void;
};

export function NodeCardHeader({
  title,
  symbolName,
  chip,
  bodyExpanded,
  onToggleCollapsed,
}: NodeCardHeaderProps) {
  const titleRef = useRef<HTMLParagraphElement>(null);
  const { isCtrlHeld } = useCtrlKey();
  const { lookup, hasSymbol } = useIndex();
  const {
    setActiveTokenKey,
    setPreviewEdges,
    clearPreviewEdges,
    scheduleHoverFire,
    scheduleHoverClear,
    scheduleInfoOpen,
    showTokenInfo,
    isCtrlPreviewMode,
  } = useGraphInteraction();

  const indexed = Boolean(symbolName && hasSymbol(symbolName));
  const defTokenKey = symbolName ? makeClassDefKey(symbolName) : "";
  const entry = symbolName ? lookup(symbolName) : null;
  const defKind = entry ? symbolKindToSemantic(entry.kind) : null;
  const { lit, on } = useTraceAppearance({ traceKey: indexed ? defTokenKey : undefined });

  const clearDefHover = useCallback(() => {
    clearPreviewEdges();
    setActiveTokenKey(null);
  }, [clearPreviewEdges, setActiveTokenKey]);

  const fireDefPreview = useCallback(() => {
    if (!symbolName || !indexed || !titleRef.current) return;
    const entry = lookup(symbolName);
    if (!entry) return;

    setActiveTokenKey(defTokenKey);
    const kind = symbolKindToSemantic(entry.kind);
    const usages = resolveUsageAnchors(symbolName, titleRef.current);
    setPreviewEdges(
      buildDefinitionFanOutEdges(symbolName, kind, titleRef.current, usages),
    );
  }, [defTokenKey, indexed, lookup, setActiveTokenKey, setPreviewEdges, symbolName]);

  const openDefInfo = useCallback(() => {
    if (!symbolName || !indexed || !titleRef.current) return;
    const entry = lookup(symbolName);
    if (!entry) return;
    showTokenInfo({
      token: symbolName,
      kind: symbolKindToSemantic(entry.kind),
      anchor: toAnchorRect(titleRef.current.getBoundingClientRect()),
      pinned: false,
      connectionCount: resolveUsageAnchors(symbolName).length,
      definedIn: symbolName,
    });
  }, [indexed, lookup, showTokenInfo, symbolName]);

  const onTitleEnter = useCallback(() => {
    if (!indexed) return;
    scheduleHoverFire(defTokenKey, fireDefPreview, clearDefHover);
    scheduleInfoOpen(defTokenKey, openDefInfo);
  }, [defTokenKey, fireDefPreview, indexed, openDefInfo, scheduleHoverFire, scheduleInfoOpen]);

  const onTitleLeave = useCallback(() => {
    if (!indexed) return;
    scheduleHoverClear(defTokenKey, clearDefHover);
  }, [clearDefHover, defTokenKey, indexed, scheduleHoverClear]);

  const onTitleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!indexed || !symbolName || !titleRef.current) return;
      e.stopPropagation();
      if (!isCtrlHeld) return;
      const entry = lookup(symbolName);
      if (!entry) return;
      showTokenInfo({
        token: symbolName,
        kind: symbolKindToSemantic(entry.kind),
        anchor: toAnchorRect(titleRef.current.getBoundingClientRect()),
        pinned: true,
        connectionCount: resolveUsageAnchors(symbolName).length,
        definedIn: symbolName,
      });
    },
    [indexed, isCtrlHeld, lookup, showTokenInfo, symbolName],
  );

  return (
    <div
      className={cn(
        "bg-accent p-2",
        bodyExpanded ? "rounded-t-lg border-b border-border" : "rounded-lg",
      )}
    >
      <div
        className={cn(
          NODE_DRAG_HANDLE,
          `${INTERACTIVE_SURFACE} flex w-full cursor-grab gap-2 rounded-md px-2 py-2 text-left active:cursor-grabbing`,
        )}
        title="Drag to move"
      >
        <GripVertical
          className="pointer-events-none size-4 shrink-0 self-center text-muted-foreground"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {chip}
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className={`node-card-caret ${INTERACTIVE_BORDER_BTN} nodrag flex size-[var(--control-height-compact)] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)]`}
              title={bodyExpanded ? "Collapse" : "Expand"}
              aria-label={bodyExpanded ? "Collapse" : "Expand"}
              aria-expanded={bodyExpanded}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapsed();
              }}
            >
              <ExpandChevron expanded={bodyExpanded} />
            </button>
            <p
              ref={titleRef}
              data-symbol-name={indexed ? symbolName : undefined}
              data-symbol-role={indexed ? "definition" : undefined}
              data-trace-key={indexed ? defTokenKey : undefined}
              data-token-kind={indexed ? defKind ?? undefined : undefined}
              className={cn(
                "node-card-title min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] font-bold",
                indexed && "token-def-label cursor-pointer",
                indexed && isCtrlPreviewMode && "token-interactive",
                lit && "token-chip-lit",
                on && "token-chip-on",
              )}
              style={
                indexed
                  ? ({ "--shimmer-delay": "0s" } as React.CSSProperties)
                  : undefined
              }
              onMouseEnter={onTitleEnter}
              onMouseLeave={onTitleLeave}
              onClick={onTitleClick}
            >
              {title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
