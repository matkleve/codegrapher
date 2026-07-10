import { Trash2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Separator } from "@/components/ui/separator";
import { INTERACTIVE_ROW_LEFT } from "@/lib/controlTokens";
import { folderDisplayName } from "@/lib/recentFolders";

type RecentFoldersDropdownProps = {
  folders: string[];
  open: boolean;
  onSelect: (path: string) => void;
  onClear: () => void;
};

/** Hover dropdown of recently opened folders, anchored under the browse button. */
export function RecentFoldersDropdown({
  folders,
  open,
  onSelect,
  onClear,
}: RecentFoldersDropdownProps) {
  if (!open || folders.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute top-full left-0 z-[100] w-72 cursor-default p-1">
      <Container className="cursor-default shadow-lg">
        <p className="cursor-default px-0 pb-2 text-xs font-medium text-muted-foreground">
          Recent folders
        </p>
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {folders.map((path) => (
            <li key={path}>
              <button
                type="button"
                className={`${INTERACTIVE_ROW_LEFT} py-2 text-[length:var(--font-size-sm)]`}
                onClick={() => onSelect(path)}
              >
                <span className="block truncate text-sm font-medium">{folderDisplayName(path)}</span>
                <span className="block truncate text-xs text-muted-foreground">{path}</span>
              </button>
            </li>
          ))}
        </ul>
        <Separator className="my-2" />
        <button
          type="button"
          className={`${INTERACTIVE_ROW_LEFT} justify-center py-2 text-muted-foreground`}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <Trash2 className="shrink-0" aria-hidden />
          Clear history
        </button>
      </Container>
    </div>
  );
}
