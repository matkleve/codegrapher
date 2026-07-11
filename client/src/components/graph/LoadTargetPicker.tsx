import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadTargetRow } from "@/components/graph/LoadTargetRow";
import {
  filterLoadTargets,
  LOAD_PICKER_SEARCH_THRESHOLD,
  sortLoadTargets,
  type LoadTargetItem,
} from "@/lib/loadTargets";
import type { SemanticTokenKind } from "@/lib/tokenColors";

const PICKER_WIDTH_PX = 300;
const VIEWPORT_MARGIN = 8;

export type LoadTargetPickerProps = {
  token: string;
  targets: LoadTargetItem[];
  anchor: { x: number; y: number };
  contextFilePath?: string;
  kind?: SemanticTokenKind;
  dotSide?: "left" | "right";
  onSelect: (filePath: string) => void;
  onClose: () => void;
};

export function LoadTargetPicker({
  token,
  targets,
  anchor,
  contextFilePath,
  kind = "function",
  dotSide = "right",
  onSelect,
  onClose,
}: LoadTargetPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const sorted = useMemo(
    () => sortLoadTargets(targets, contextFilePath),
    [contextFilePath, targets],
  );
  const filtered = useMemo(
    () => filterLoadTargets(sorted, query),
    [query, sorted],
  );
  const showSearch = targets.length > LOAD_PICKER_SEARCH_THRESHOLD;

  useEffect(() => {
    openedAtRef.current = Date.now();
  }, []);

  useLayoutPosition(panelRef, anchor, setPosition);

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
      className="pointer-events-auto fixed z-[62] overflow-hidden rounded-xl border border-border bg-card/98 shadow-lg backdrop-blur-sm"
      style={{
        width: PICKER_WIDTH_PX,
        left: position?.left ?? anchor.x,
        top: position?.top ?? anchor.y + 10,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div className="border-b border-border px-3 py-2">
        <p className="font-mono text-xs font-semibold text-foreground">{token}</p>
        <p className="text-[10px] text-muted-foreground">
          Choose a file to load into the graph
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

      <ul className="max-h-48 overflow-y-auto px-1 py-1">
        {filtered.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-muted-foreground">
            No matching files
          </li>
        ) : (
          filtered.map((item) => (
            <li key={`${item.filePath}:${item.line}`}>
              <LoadTargetRow
                item={item}
                token={token}
                kind={kind}
                dotSide={dotSide}
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

function useLayoutPosition(
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
    let top = anchor.y + 10;

    if (left + width > viewportW - VIEWPORT_MARGIN) {
      left = viewportW - width - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    if (top + height > viewportH - VIEWPORT_MARGIN) {
      top = anchor.y - height - 10;
    }
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;

    setPosition({ left, top });
  }, [anchor.x, anchor.y, panelRef, setPosition]);
}
