import { FolderSearch, FolderSync, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderPathInput } from "@/components/explorer/FolderPathInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TreeNode } from "@/components/explorer/FileTree";
import { RecentFilesSection } from "@/components/explorer/RecentFilesSection";
import { RecentFoldersDropdown } from "@/components/explorer/RecentFoldersDropdown";
import { EXPLORER_X_PAD } from "@/components/explorer/explorerRowStyles";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useFolderExplorer } from "@/components/explorer/useFolderExplorer";
import { useSidebarLayout } from "@/context/SidebarLayoutContext";
import {
  indexProgressFill,
  indexProgressLabel,
  indexProgressSubtitle,
} from "@/lib/indexProgress";
import { cn } from "@/lib/utils";

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
  /** Called after a folder is indexed and the tree is ready. */
  onFolderOpened?: (folderPath: string) => void;
  /** Files currently shown in the graph (highlighted in the tree). */
  graphFilePaths?: Set<string>;
}

export default function FileExplorer({
  onFileClick,
  onFolderOpened,
  graphFilePaths,
}: FileExplorerProps) {
  const {
    folderPath,
    setFolderPath,
    rootEntries,
    rootPath,
    error,
    opening,
    statusMessage,
    indexing,
    indexStatus,
    recentFolders,
    recentFiles,
    recentFoldersOpen,
    setRecentFoldersOpen,
    recentSectionOpen,
    toggleRecentSection,
    handleFileClick,
    handleOpen,
    handleBrowse,
    handleRecentFolderSelect,
    handleClearRecentFolders,
    folderBusy,
  } = useFolderExplorer(onFileClick, onFolderOpened);
  const { toggleCollapsed } = useSidebarLayout();
  const progressFill = indexProgressFill(indexStatus);
  const progressSubtitle = indexing
    ? indexProgressSubtitle(indexStatus)
    : opening
      ? "Reading folder tree…"
      : null;
  const showProgress = folderBusy && progressFill !== null;
  const busyLabel = indexing
    ? indexProgressLabel(indexStatus)
    : opening
      ? (statusMessage ?? "Loading folder…")
      : "Load folder";

  return (
    <aside className="pointer-events-auto flex h-full min-w-0 flex-1 flex-col overflow-visible">
      <div className="pointer-events-auto relative z-30 flex shrink-0 flex-col gap-2 overflow-visible p-3">
        <div className="flex gap-2 overflow-visible">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            title="Sidebar einklappen"
            aria-label="Sidebar einklappen"
            className="size-[var(--control-height-lg)] shrink-0"
          >
            <PanelLeftClose data-icon="inline-start" />
          </Button>
          <div
            className="pointer-events-auto relative z-[100] shrink-0"
            onMouseEnter={() => setRecentFoldersOpen(true)}
            onMouseLeave={() => setRecentFoldersOpen(false)}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBrowse}
              disabled={folderBusy}
              title="Choose folder"
              aria-label="Choose folder"
              aria-haspopup="listbox"
              aria-expanded={recentFoldersOpen && recentFolders.length > 0}
              className="size-[var(--control-height-lg)] shrink-0"
            >
              <FolderSearch data-icon="inline-start" />
            </Button>
            <RecentFoldersDropdown
              folders={recentFolders}
              open={recentFoldersOpen}
              onSelect={handleRecentFolderSelect}
              onClear={handleClearRecentFolders}
            />
          </div>
          <FolderPathInput
            value={folderPath}
            onChange={setFolderPath}
            onEnter={handleOpen}
            disabled={folderBusy}
          />
        </div>
        <Button
          type="button"
          variant={folderBusy ? "ghost" : rootPath ? "secondary" : "default"}
          onClick={handleOpen}
          disabled={folderBusy}
          className={cn(
            "relative !h-[var(--control-height-double)] !max-h-[var(--control-height-double)] !min-h-[var(--control-height-double)] w-full shrink-0 overflow-hidden",
            folderBusy &&
              "load-folder-busy border-transparent bg-muted disabled:cursor-wait disabled:opacity-100",
          )}
          aria-busy={opening || indexing}
          aria-label={folderBusy ? busyLabel : "Load folder"}
          aria-valuenow={
            progressFill !== null ? Math.round(progressFill * 100) : undefined
          }
          aria-valuemin={progressFill !== null ? 0 : undefined}
          aria-valuemax={progressFill !== null ? 100 : undefined}
        >
          {showProgress && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left bg-brand-surface transition-transform duration-500 ease-[var(--ease)]"
              style={{ transform: `scaleX(${progressFill})` }}
              aria-hidden
            />
          )}
          <span className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-0.5 px-[var(--control-padding-x-md)]">
            <span className="inline-flex max-w-full items-center justify-center gap-[var(--control-gap)] leading-none text-current">
              <FolderSync data-icon="inline-start" className="text-current" aria-hidden />
              <span className="truncate font-medium">{busyLabel}</span>
            </span>
            {folderBusy && (
              <span className="h-[0.875rem] w-full max-w-full truncate text-center text-[length:var(--font-size-xs)] leading-[0.875rem] text-current opacity-80">
                {progressSubtitle ?? "\u00a0"}
              </span>
            )}
          </span>
        </Button>
        {error && <p className="whitespace-pre-line text-xs text-destructive">{error}</p>}
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="pointer-events-auto relative z-0 min-h-0 flex-1">
        <div className={cn("pointer-events-auto flex flex-col gap-0.5 py-1", EXPLORER_X_PAD)}>
          <RecentFilesSection
            files={recentFiles}
            open={recentSectionOpen}
            onToggle={toggleRecentSection}
            onFileClick={handleFileClick}
            graphFilePaths={graphFilePaths}
          />

          {rootPath && (
            <p className="break-all px-1 py-2 text-xs text-muted-foreground">{rootPath}</p>
          )}
          <div className="flex flex-col gap-0.5">
            {rootEntries?.map((entry) => (
              <TreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                onFileClick={handleFileClick}
                disabled={folderBusy}
                graphFilePaths={graphFilePaths}
              />
            ))}
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />
      <div className={cn("pointer-events-auto shrink-0 py-3", EXPLORER_X_PAD)}>
        <ThemeToggle />
      </div>
    </aside>
  );
}
