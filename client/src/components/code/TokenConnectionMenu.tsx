import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Code2, DownloadCloud } from "lucide-react";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { MenuPanelHeader } from "@/components/ui/MenuPanelHeader";
import { MenuSearchField } from "@/components/ui/MenuSearchField";
import { floatingPanelClass } from "@/components/ui/floatingPanel";
import { ConnectionMenuRow } from "@/components/graph/ConnectionMenuRow";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import {
  HOVER_MENU_CURSOR_PAD,
  useHoverMenuPointer,
} from "@/hooks/useHoverMenuPointer";
import { useViewportAnchoredPosition } from "@/hooks/useViewportAnchoredPosition";
import { openFileInEditor } from "@/api";
import {
  type ConnectionMenuRow as ConnectionMenuRowData,
  type TokenConnectionMenuState,
} from "@/lib/connectionMenu";
import { LOAD_PICKER_SEARCH_THRESHOLD } from "@/lib/loadTargets";
import { cn } from "@/lib/utils";

const MENU_WIDTH_PX = 320;

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

  const loadRows = useMemo(
    () =>
      filteredSections
        .flatMap((s) => s.rows)
        .filter((row) => row.action === "load" && row.filePath),
    [filteredSections],
  );

  const handleLoadAll = () => {
    for (const row of loadRows) loadTarget(row.filePath);
    onClose();
  };

  const isHoverMenu = menu.variant === "hover";
  const menuKey = `${menu.token}:${menu.role}:${menu.variant}`;
  const activeAnchor = useHoverMenuPointer(
    menu.variant,
    menu.anchor,
    menuKey,
    onClose,
  );

  const position = useViewportAnchoredPosition(
    panelRef,
    activeAnchor,
    isHoverMenu
      ? { mode: "cursor", pad: HOVER_MENU_CURSOR_PAD, viewportMargin: 6 }
      : {
          mode: "panel",
          gapBelow: 6,
          gapAbove: 6,
          placement: menu.anchor.placement ?? "below",
        },
  );

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
      className={floatingPanelClass("fixed z-[62]", allRows.length === 1 ? "min-w-48" : undefined)}
      style={{
        width: MENU_WIDTH_PX,
        left:
          position?.left ??
          (isHoverMenu ? activeAnchor.x + HOVER_MENU_CURSOR_PAD : activeAnchor.x),
        top:
          position?.top ??
          (isHoverMenu
            ? activeAnchor.y + HOVER_MENU_CURSOR_PAD
            : activeAnchor.y + 6),
        visibility: position ? "visible" : "hidden",
      }}
      onMouseEnter={cancelHoverLeaveGrace}
      onMouseLeave={menu.variant === "hover" ? scheduleHoverLeaveGrace : undefined}
    >
      <MenuPanelHeader title={menu.token} subtitle={subtitle} />

      {showSearch ? (
        <MenuSearchField
          value={query}
          onChange={setQuery}
          placeholder="Filter connections…"
          autoFocus={menu.variant === "context"}
        />
      ) : null}

      {menu.simActions && menu.simActions.length > 0 ? (
        <div className="border-b border-border px-1.5 py-1.5">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Simulation
          </p>
          <ul className="flex flex-col gap-0.5">
            {menu.simActions.map((action) => (
              <li key={action.id}>
                <InteractiveListRow
                  title={action.label}
                  onClick={() => {
                    action.onSelect();
                    onClose();
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-x-hidden overflow-y-auto px-1.5 py-1.5",
          allRows.length > 6 ? "max-h-48" : "",
        )}
      >
        {loadRows.length > 1 ? (
          <div className="mb-2">
            <InteractiveListRow
              title={`Load all · ${loadRows.length}`}
              leading={<DownloadCloud className="size-3.5 shrink-0" aria-hidden />}
              onClick={handleLoadAll}
            />
          </div>
        ) : null}

        {filteredSections.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No matching connections
          </p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.id} className="mb-2 last:mb-0">
              {menu.variant === "context" && menu.sections.length > 1 ? (
                <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <ConnectionMenuRow
                      row={row}
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
        <p className="border-t border-border px-3 py-2 text-center text-2xs leading-snug text-muted-foreground">
          Right-click for all connections · jump · open in editor
        </p>
      ) : null}

      {menu.variant === "context" && menu.editorTarget ? (
        <div className="border-t border-border px-1.5 py-1.5">
          <InteractiveListRow
            title="Open in editor"
            leading={<Code2 className="size-3.5 shrink-0" aria-hidden />}
            onClick={() => {
              void openFileInEditor(
                menu.editorTarget!.filePath,
                menu.editorTarget!.line,
              );
              onClose();
            }}
          />
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
