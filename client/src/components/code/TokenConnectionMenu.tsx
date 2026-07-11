import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Code2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConnectionMenuRow } from "@/components/graph/ConnectionMenuRow";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import { openFileInEditor } from "@/api";
import {
  type ConnectionMenuRow as ConnectionMenuRowData,
  type TokenConnectionMenuState,
} from "@/lib/connectionMenu";
import { LOAD_PICKER_SEARCH_THRESHOLD } from "@/lib/loadTargets";
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

function rowMatchesQuery(row: ConnectionMenuRowData, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.primaryLabel.toLowerCase().includes(q) ||
    row.secondaryLabel.toLowerCase().includes(q) ||
    row.filePath.toLowerCase().includes(q)
  );
}

function TokenConnectionMenuPanel({
  menu,
  onClose,
}: {
  menu: TokenConnectionMenuState;
  onClose: () => void;
}) {
  const loadTarget = useLoadTargetAction();
  const { cancelHoverLeaveGrace, scheduleHoverLeaveGrace, focusFlowNode, focusReadingMember } =
    useGraphInteraction();
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const allRows = useMemo(
    () => menu.sections.flatMap((s) => s.rows),
    [menu.sections],
  );
  const showSearch = allRows.length > LOAD_PICKER_SEARCH_THRESHOLD;

  const filteredSections = useMemo(() => {
    return menu.sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter((row) => rowMatchesQuery(row, query)),
      }))
      .filter((section) => section.rows.length > 0);
  }, [menu.sections, query]);

  useMenuPosition(panelRef, menu.anchor, setPosition);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleRowAction = (row: ConnectionMenuRowData) => {
    if (row.action === "jump" && row.flowNodeId) {
      if (row.memberId) {
        focusReadingMember(row.flowNodeId, row.memberId);
      } else {
        focusFlowNode(row.flowNodeId);
      }
    } else if (row.action === "load" && row.filePath) {
      loadTarget(row.filePath);
    } else if (row.action === "openEditor") {
      void openFileInEditor(row.filePath, row.line);
    }
    onClose();
  };

  const subtitle =
    menu.variant === "context"
      ? "All connections"
      : menu.role === "usage"
        ? "Choose a definition to load"
        : "Choose a caller file to load";

  return createPortal(
    <div
      ref={panelRef}
      data-token-connection-menu
      role="menu"
      aria-label={`Connections for ${menu.token}`}
      className={cn(
        "pointer-events-auto fixed z-[62] overflow-hidden rounded-xl border border-border bg-card/98 shadow-lg backdrop-blur-sm",
        allRows.length === 1 ? "min-w-48" : "",
      )}
      style={{
        width: MENU_WIDTH_PX,
        left: position?.left ?? menu.anchor.x,
        top: position?.top ?? menu.anchor.y + 6,
        visibility: position ? "visible" : "hidden",
      }}
      onMouseEnter={cancelHoverLeaveGrace}
      onMouseLeave={menu.variant === "hover" ? scheduleHoverLeaveGrace : undefined}
    >
      <div className="border-b border-border px-3 py-2">
        <p className="font-mono text-xs font-semibold text-foreground">{menu.token}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
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
              placeholder="Filter connections…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-7 pl-8 text-xs"
              autoFocus={menu.variant === "context"}
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-y-auto px-1 py-1",
          allRows.length > 6 ? "max-h-48" : "",
        )}
      >
        {filteredSections.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No matching connections
          </p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.id} className="mb-1 last:mb-0">
              {menu.variant === "context" && menu.sections.length > 1 ? (
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
              ) : null}
              <ul>
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <ConnectionMenuRow
                      row={row}
                      role={menu.role}
                      onSelect={() => handleRowAction(row)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {menu.showRightClickHint ? (
        <p className="border-t border-border px-3 py-2 text-center text-[10px] text-muted-foreground">
          Right-click for all connections · jump · open in editor
        </p>
      ) : null}

      {menu.variant === "context" && menu.editorTarget ? (
        <div className="border-t border-border px-2 py-1.5">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted"
            onClick={() => {
              void openFileInEditor(
                menu.editorTarget!.filePath,
                menu.editorTarget!.line,
              );
              onClose();
            }}
          >
            <Code2 className="size-3.5 shrink-0" aria-hidden />
            Open in editor
          </button>
        </div>
      ) : null}
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
