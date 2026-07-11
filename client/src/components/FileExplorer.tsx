import { FolderOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TreeNode } from "@/components/explorer/FileTree";
import { RecentFilesSection } from "@/components/explorer/RecentFilesSection";
import { RecentFoldersDropdown } from "@/components/explorer/RecentFoldersDropdown";
import { EXPLORER_X_PAD } from "@/components/explorer/explorerRowStyles";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useFolderExplorer } from "@/components/explorer/useFolderExplorer";
import { useSidebarLayout } from "@/context/SidebarLayoutContext";
import { cn } from "@/lib/utils";

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
  /** Disables folder tree only; recent files stay clickable. */
  treeDisabled?: boolean;
  /** Files currently shown in the graph (highlighted in the tree). */
  graphFilePaths?: Set<string>;
}

export default function FileExplorer({
  onFileClick,
  treeDisabled: disabled,
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
  } = useFolderExplorer(onFileClick);
  const { toggleCollapsed } = useSidebarLayout();

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
              variant="outline"
              size="icon"
              onClick={handleBrowse}
              disabled={disabled || opening}
              title="Browse for folder"
              aria-label="Browse for folder"
              aria-haspopup="listbox"
              aria-expanded={recentFoldersOpen && recentFolders.length > 0}
              className="size-[var(--control-height-lg)] shrink-0"
            >
              <FolderOpen data-icon="inline-start" />
            </Button>
            <RecentFoldersDropdown
              folders={recentFolders}
              open={recentFoldersOpen}
              onSelect={handleRecentFolderSelect}
              onClear={handleClearRecentFolders}
            />
          </div>
          <Input
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpen()}
            placeholder="/absolute/path/to/project"
            disabled={disabled || opening}
            title={folderPath || undefined}
            className="min-w-0 flex-1 font-mono text-[length:var(--font-size-xs)]"
          />
        </div>
        <Button
          type="button"
          variant={rootPath ? "secondary" : "default"}
          onClick={handleOpen}
          disabled={disabled || opening}
          className="w-full"
        >
          <FolderOpen data-icon="inline-start" />
          {opening || indexing ? (statusMessage ?? "Opening…") : "Open"}
        </Button>
        {(statusMessage || indexing) && (
          <p className="text-xs text-muted-foreground">{statusMessage ?? "Indexing project…"}</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
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
                disabled={disabled}
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
