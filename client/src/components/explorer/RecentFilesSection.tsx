import { Separator } from "@/components/ui/separator";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { Codicon } from "@/lib/fileIcons";
import { ExplorerTreeGuide, FileTreeItem } from "@/components/explorer/FileTree";
import { fileDisplayName } from "@/lib/recentFiles";
import { isFileInGraph } from "@/lib/graphFiles";

type RecentFilesSectionProps = {
  files: string[];
  open: boolean;
  onToggle: () => void;
  onFileClick: (filePath: string) => void;
  graphFilePaths?: Set<string>;
};

/** Collapsible "Recent" list of recently opened files for the active folder. */
export function RecentFilesSection({
  files,
  open,
  onToggle,
  onFileClick,
  graphFilePaths,
}: RecentFilesSectionProps) {
  if (files.length === 0) return null;

  return (
    <section className="pointer-events-auto relative shrink-0">
      <InteractiveListRow
        variant="explorerSection"
        density="compact"
        title="Recent"
        contentTone="muted"
        aria-expanded={open}
        leading={
          <Codicon
            name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
            className="shrink-0"
          />
        }
        trailing={<span className="control-row-text-secondary">{files.length}</span>}
        onClick={onToggle}
      />
      {open && (
        <ExplorerTreeGuide>
          {files.map((path) => (
            <FileTreeItem
              key={path}
              filePath={path}
              name={fileDisplayName(path)}
              onFileClick={onFileClick}
              inGraph={isFileInGraph(path, graphFilePaths ?? new Set())}
            />
          ))}
        </ExplorerTreeGuide>
      )}
      <Separator className="my-1 bg-sidebar-border" />
    </section>
  );
}
