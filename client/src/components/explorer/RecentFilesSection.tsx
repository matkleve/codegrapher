import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Codicon } from "@/lib/fileIcons";
import { ExplorerTreeGuide, FileTreeItem } from "@/components/explorer/FileTree";
import { TREE_SECTION_ROW } from "@/components/explorer/explorerRowStyles";
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
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className={TREE_SECTION_ROW}
        aria-expanded={open}
      >
        <Codicon name={open ? "codicon-chevron-down" : "codicon-chevron-right"} className="shrink-0" />
        <span className="truncate leading-none">Recent</span>
        <span className="ml-auto shrink-0 leading-none">{files.length}</span>
      </Button>
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
