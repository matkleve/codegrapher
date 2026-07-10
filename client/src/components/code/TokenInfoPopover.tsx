import { createPortal } from "react-dom";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

const KIND_LABEL: Record<string, string> = {
  class: "Class",
  function: "Function",
  type: "Type",
};

export function TokenInfoPopover() {
  const { tokenInfo, cancelHoverTimers } = useGraphInteraction();
  if (!tokenInfo) return null;

  const { token, kind, anchor, pinned, connectionCount, definedIn } = tokenInfo;
  const swatch = TOKEN_EDGE_STROKE[kind];

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = 232;
  const estimatedHeight = 140;
  let left = anchor.left;
  let top = anchor.bottom + 8;
  if (left + width > viewportW - 8) left = viewportW - width - 8;
  if (top + estimatedHeight > viewportH - 8) top = anchor.top - estimatedHeight - 8;

  return createPortal(
    <div
      data-token-info-popover
      className="token-info-popover pointer-events-auto fixed z-50 w-[232px] rounded-[11px] border border-border bg-card p-3 text-xs text-foreground shadow-md"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onMouseEnter={cancelHoverTimers}
    >
      <p className="font-mono text-[11px] text-muted-foreground">
        {kind === "function" ? "call" : "reference"}
      </p>
      <div className="mt-0.5 mb-2 flex items-center gap-2 font-semibold">
        <span
          className="size-[9px] shrink-0 rounded-[3px]"
          style={{ background: swatch }}
          aria-hidden
        />
        {token}
      </div>
      <div className="flex justify-between gap-2 border-t border-border py-1">
        <span>kind</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {KIND_LABEL[kind] ?? kind}
        </span>
      </div>
      <div className="flex justify-between gap-2 border-t border-border py-1">
        <span>connects</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {connectionCount} site{connectionCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex justify-between gap-2 border-t border-border py-1">
        <span>defined in</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {definedIn}
        </span>
      </div>
      <p
        className={
          pinned
            ? "mt-2 text-[11px] text-brand"
            : "mt-2 text-[11px] text-muted-foreground"
        }
      >
        {pinned ? "◆ pinned — click empty space to close" : "Ctrl-click to pin"}
      </p>
    </div>,
    document.body,
  );
}
