import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MenuPanelHeader } from "@/components/ui/MenuPanelHeader";
import { MenuSearchField } from "@/components/ui/MenuSearchField";
import { floatingPanelClass } from "@/components/ui/floatingPanel";
import { LoadTargetRow } from "@/components/graph/LoadTargetRow";
import { useViewportAnchoredPosition } from "@/hooks/useViewportAnchoredPosition";
import {
  filterLoadTargets,
  LOAD_PICKER_SEARCH_THRESHOLD,
  sortLoadTargets,
  type LoadTargetItem,
} from "@/lib/loadTargets";
import type { SemanticTokenKind } from "@/lib/tokenColors";

const PICKER_WIDTH_PX = 320;

export type LoadTargetPickerProps = {
  token: string;
  targets: LoadTargetItem[];
  anchor: { x: number; y: number };
  contextFilePath?: string;
  kind?: SemanticTokenKind;
  onSelect: (filePath: string) => void;
  onClose: () => void;
};

export function LoadTargetPicker({
  token,
  targets,
  anchor,
  contextFilePath,
  kind = "function",
  onSelect,
  onClose,
}: LoadTargetPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => sortLoadTargets(targets, contextFilePath),
    [contextFilePath, targets],
  );
  const filtered = useMemo(
    () => filterLoadTargets(sorted, query),
    [query, sorted],
  );
  const showSearch = targets.length > LOAD_PICKER_SEARCH_THRESHOLD;

  const position = useViewportAnchoredPosition(panelRef, anchor, {
    mode: "panel",
    gapBelow: 10,
    gapAbove: 10,
  });

  useEffect(() => {
    openedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (Date.now() - openedAtRef.current < 120) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Load ${token}`}
      className={floatingPanelClass("fixed z-[62]")}
      style={{
        width: PICKER_WIDTH_PX,
        left: position?.left ?? anchor.x,
        top: position?.top ?? anchor.y + 10,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <MenuPanelHeader
        title={token}
        subtitle="Choose a file to load into the graph"
      />

      {showSearch ? (
        <MenuSearchField
          value={query}
          onChange={setQuery}
          placeholder="Filter files…"
          autoFocus
        />
      ) : null}

      <ul className="flex max-h-48 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-1.5 py-1.5">
        {filtered.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-muted-foreground">
            No matching files
          </li>
        ) : (
          filtered.map((item) => (
            <li key={`${item.filePath}:${item.line}`}>
              <LoadTargetRow
                item={item}
                token={token}
                kind={kind}
                onSelect={() => {
                  onSelect(item.filePath);
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
