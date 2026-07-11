import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadTargetRow } from "@/components/graph/LoadTargetRow";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import {
  connectionMenuDotSide,
  type TokenConnectionMenuState,
} from "@/lib/connectionMenu";
import {
  filterLoadTargets,
  LOAD_PICKER_SEARCH_THRESHOLD,
  sortLoadTargets,
} from "@/lib/loadTargets";
import { cn } from "@/lib/utils";

const MENU_WIDTH_PX = 300;
const VIEWPORT_MARGIN = 8;

function useMenuPosition(
  panelRef: React.RefObject<HTMLDivElement | null>,
  anchor: { x: number; y: number },
  setPosition: (pos: { left: number; top: number }) => void,
): void {
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const { width, height } = panel.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = anchor.x - width / 2;
    let top = anchor.y + 6;

    if (left + width > viewportW - VIEWPORT_MARGIN) {
      left = viewportW - width - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    if (top + height > viewportH - VIEWPORT_MARGIN) {
      top = anchor.y - height - 6;
    }
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;

    setPosition({ left, top });
  }, [anchor.x, anchor.y, panelRef, setPosition]);
}

function TokenConnectionMenuPanel({
  menu,
  onClose,
}: {
  menu: TokenConnectionMenuState;
  onClose: () => void;
}) {
  const loadTarget = useLoadTargetAction();
  const { cancelHoverLeaveGrace, scheduleHoverLeaveGrace } = useGraphInteraction();
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const sorted = useMemo(
    () => sortLoadTargets(menu.targets, menu.contextFilePath),
    [menu.contextFilePath, menu.targets],
  );
  const filtered = useMemo(
    () => filterLoadTargets(sorted, query),
    [query, sorted],
  );
  const showSearch = menu.targets.length > LOAD_PICKER_SEARCH_THRESHOLD;
  const dotSide = connectionMenuDotSide(menu.role);

  useMenuPosition(panelRef, menu.anchor, setPosition);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={panelRef}
      data-token-connection-menu
      role="menu"
      aria-label={`Load ${menu.token}`}
      className={cn(
        "pointer-events-auto fixed z-[62] overflow-hidden rounded-xl border border-border bg-card/98 shadow-lg backdrop-blur-sm",
        menu.targets.length === 1 ? "min-w-48" : "",
      )}
      style={{
        width: MENU_WIDTH_PX,
        left: position?.left ?? menu.anchor.x,
        top: position?.top ?? menu.anchor.y + 6,
        visibility: position ? "visible" : "hidden",
      }}
      onMouseEnter={cancelHoverLeaveGrace}
      onMouseLeave={scheduleHoverLeaveGrace}
    >
      <div className="border-b border-border px-3 py-2">
        <p className="font-mono text-xs font-semibold text-foreground">{menu.token}</p>
        <p className="text-[10px] text-muted-foreground">
          {menu.role === "usage"
            ? "Choose a definition to load"
            : "Choose a caller file to load"}
        </p>
      </div>

      {showSearch ? (
        <div className="border-b border-border px-2 py-1.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Filter files…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-7 pl-8 text-xs"
              autoFocus
            />
          </div>
        </div>
      ) : null}

      <ul
        className={cn(
          "overflow-y-auto px-1 py-1",
          menu.targets.length > 6 ? "max-h-48" : "",
        )}
      >
        {filtered.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-muted-foreground">
            No matching files
          </li>
        ) : (
          filtered.map((item) => (
            <li key={`${item.filePath}:${item.line}`}>
              <LoadTargetRow
                item={item}
                token={menu.token}
                kind={menu.kind}
                dotSide={dotSide}
                onSelect={() => {
                  loadTarget(item.filePath);
                  onClose();
                }}
              />
            </li>
          ))
        )}
      </ul>
    </div>,
    document.body,
  );
}

export function TokenConnectionMenu() {
  const { connectionMenu, clearConnectionMenu } = useGraphInteraction();

  if (!connectionMenu) return null;

  return (
    <TokenConnectionMenuPanel
      menu={connectionMenu}
      onClose={clearConnectionMenu}
    />
  );
}
