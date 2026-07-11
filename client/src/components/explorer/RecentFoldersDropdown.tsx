import { Trash2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { Separator } from "@/components/ui/separator";
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
        <p className="cursor-default px-0 pb-2 control-row-text-secondary font-medium">
          Recent folders
        </p>
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {folders.map((path) => (
            <li key={path}>
              <InteractiveListRow
                title={folderDisplayName(path)}
                subtitle={path}
                onClick={() => onSelect(path)}
              />
            </li>
          ))}
        </ul>
        <Separator className="my-2" />
        <InteractiveListRow
          density="compact"
          title="Clear history"
          contentTone="muted"
          className="justify-center"
          leading={<Trash2 className="shrink-0" aria-hidden />}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        />
      </Container>
    </div>
  );
}
