import { createPortal } from "react-dom";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

export function JumpTooltip() {
  const { jumpTooltip } = useGraphInteraction();
  if (!jumpTooltip) return null;

  const { token, kind, x, y } = jumpTooltip;
  const pad = 14;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = 180;
  const height = 32;
  let left = x + pad;
  let top = y + pad;
  if (left + width > viewportW - 6) left = x - width - pad;
  if (top + height > viewportH - 6) top = y - height - pad;

  return createPortal(
    <div
      className="jump-tip pointer-events-none fixed z-[60] flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2 py-1 text-[11.5px] font-medium text-foreground shadow-md"
      style={{ left: Math.max(6, left), top: Math.max(6, top) }}
    >
      <span className="font-bold text-brand">↳</span>
      <span>Jump to</span>
      <span
        className="size-2 rounded-sm"
        style={{ background: TOKEN_EDGE_STROKE[kind] }}
        aria-hidden
      />
      <b>{token}</b>
      <span className="font-mono text-[10.5px] text-muted-foreground">{kind}</span>
    </div>,
    document.body,
  );
}
