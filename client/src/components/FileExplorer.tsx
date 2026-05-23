import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import { browseFolder, fetchTree } from "@/api";
import { useIndex } from "@/context/IndexContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/ui/Container";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { Codicon, getFileIcon, getFolderIcon } from "@/lib/fileIcons";
import {
  clearRecentFolders,
  folderDisplayName,
  loadRecentFolders,
  prependRecentFolder,
} from "@/lib/recentFolders";
import { loadLastFolder, saveLastFolder, shouldRestoreFolder } from "@/lib/lastSession";
import {
  fileDisplayName,
  loadRecentFiles,
  loadRecentSectionOpen,
  prependRecentFile,
  RECENT_FILES_CHANGED_EVENT,
  saveRecentSectionOpen,
  setActiveFolderRoot,
} from "@/lib/recentFiles";
import { isFileInGraph } from "@/lib/graphFiles";
import { cn } from "@/lib/utils";
import type { TreeEntry } from "@/types";

const EXPLORER_X_PAD = "px-2";

/** VS Code–like explorer row density */
const TREE_ROW =
  "hoverable pointer-events-auto flex h-[22px] cursor-pointer items-center gap-1.5 rounded-sm px-1.5 text-xs font-mono leading-none";
const TREE_FOLDER_ROW =
  "hoverable pointer-events-auto h-[22px] w-full cursor-pointer justify-start gap-1.5 rounded-sm border border-transparent px-1.5 text-xs font-medium leading-none disabled:cursor-not-allowed";

/** Vertical guide + indent for nested files under a folder/section. */
function ExplorerTreeGuide({ children }: { children: ReactNode }) {
  return (
    <div className="explorer-tree-guide ml-3 border-l border-sidebar-border pl-2">
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
  /** Disables folder tree only; recent files stay clickable. */
  treeDisabled?: boolean;
  /** Files currently shown in the graph (highlighted in the tree). */
  graphFilePaths?: Set<string>;
}

interface FileTreeItemProps {
  filePath: string;
  name: string;
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
  inGraph?: boolean;
}

function FileTreeItem({
  filePath,
  name,
  onFileClick,
  disabled,
  inGraph,
}: FileTreeItemProps) {
  const fileIcon = getFileIcon(name);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={true}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(DRAG_FILEPATH_KEY, filePath);
        e.dataTransfer.setData("text/plain", filePath);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onFileClick(filePath);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !disabled) {
          e.stopPropagation();
          onFileClick(filePath);
        }
      }}
      className={cn(
        TREE_ROW,
        "active:cursor-grabbing",
        inGraph ? "font-medium text-primary" : "text-foreground",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      {fileIcon.vscodeIcon ? (
        <VscodeFileIcon icon={fileIcon.vscodeIcon} size={14} className="size-3.5" />
      ) : (
        <Codicon name={fileIcon.codicon!} className={cn("size-3.5 shrink-0", fileIcon.colorClass)} />
      )}
      <span className="truncate">{name}</span>
    </div>
  );
}

interface TreeNodeProps {
  entry: TreeEntry;
  depth: number;
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
  graphFilePaths?: Set<string>;
}

function TreeNode({ entry, depth, onFileClick, disabled, graphFilePaths }: TreeNodeProps) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<TreeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleFolder = useCallback(async () => {
    if (disabled) return;
    if (!open && children === null) {
      setLoading(true);
      try {
        const data = await fetchTree(entry.path);
        setChildren(data.entries);
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  }, [children, disabled, entry.path, open]);

  if (entry.type === "directory") {
    const folderIcon = getFolderIcon(open);
    return (
      <div className="flex flex-col gap-0.5">
        <Button
          type="button"
          variant="ghost"
          onClick={toggleFolder}
          disabled={disabled}
          className={TREE_FOLDER_ROW}
        >
          <Codicon
            name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
            className="size-3 shrink-0 text-muted-foreground"
          />
          <Codicon name={folderIcon.codicon} className={cn("size-3.5 shrink-0", folderIcon.colorClass)} />
          <span className="truncate">{entry.name}</span>
          {loading && <span className="text-xs text-muted-foreground">…</span>}
        </Button>
        {open && (
          <ExplorerTreeGuide>
            {children?.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileClick={onFileClick}
                disabled={disabled}
                graphFilePaths={graphFilePaths}
              />
            ))}
          </ExplorerTreeGuide>
        )}
      </div>
    );
  }

  if (depth === 0) {
    return (
      <ExplorerTreeGuide>
        <FileTreeItem
          filePath={entry.path}
          name={entry.name}
          onFileClick={onFileClick}
          disabled={disabled}
          inGraph={isFileInGraph(entry.path, graphFilePaths ?? new Set())}
        />
      </ExplorerTreeGuide>
    );
  }

  return (
    <FileTreeItem
      filePath={entry.path}
      name={entry.name}
      onFileClick={onFileClick}
      disabled={disabled}
      inGraph={isFileInGraph(entry.path, graphFilePaths ?? new Set())}
    />
  );
}

interface RecentFoldersDropdownProps {
  folders: string[];
  open: boolean;
  onSelect: (path: string) => void;
  onClear: () => void;
}

function RecentFoldersDropdown({
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
                className="hoverable w-full cursor-pointer rounded-sm border border-transparent px-2 py-2 text-left"
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
          className="hoverable flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent px-2 py-2 text-xs text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <Trash2 className="size-3.5 shrink-0" aria-hidden />
          Clear history
        </button>
      </Container>
    </div>
  );
}

interface RecentFilesSectionProps {
  files: string[];
  open: boolean;
  onToggle: () => void;
  onFileClick: (filePath: string) => void;
  graphFilePaths?: Set<string>;
}

function RecentFilesSection({
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
        className={cn(TREE_FOLDER_ROW, "text-muted-foreground")}
        aria-expanded={open}
      >
        <Codicon
          name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
          className="size-3 shrink-0"
        />
        <span>Recent</span>
        <span className="ml-auto text-muted-foreground">{files.length}</span>
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

export default function FileExplorer({
  onFileClick,
  treeDisabled: disabled,
  graphFilePaths,
}: FileExplorerProps) {
  const [folderPath, setFolderPath] = useState(() => loadLastFolder() ?? "");
  const [rootEntries, setRootEntries] = useState<TreeEntry[] | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { loadIndex, indexing } = useIndex();
  const [recentFolders, setRecentFolders] = useState<string[]>(() => loadRecentFolders());
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [recentFoldersOpen, setRecentFoldersOpen] = useState(false);
  const [recentSectionOpen, setRecentSectionOpen] = useState(loadRecentSectionOpen);

  const toggleRecentSection = () => {
    setRecentSectionOpen((open) => {
      const next = !open;
      saveRecentSectionOpen(next);
      return next;
    });
  };

  const handleFileClick = useCallback(
    (filePath: string) => {
      setRecentFiles((prev) => prependRecentFile(filePath, prev));
      onFileClick(filePath);
    },
    [onFileClick],
  );

  const rememberFolder = useCallback((path: string) => {
    setRecentFolders((prev) => prependRecentFolder(path, prev));
    saveLastFolder(path);
  }, []);

  const openFolderAt = useCallback(
    async (dirPath: string) => {
      setOpening(true);
      setError(null);
      setStatusMessage("Indexing project...");
      try {
        await loadIndex(dirPath);
        setStatusMessage(null);
        const data = await fetchTree(dirPath);
        setFolderPath(data.path);
        setRootPath(data.path);
        setRootEntries(data.entries);
        setActiveFolderRoot(data.path);
        setRecentFiles(loadRecentFiles(data.path));
        rememberFolder(data.path);
      } catch (err) {
        setRootEntries(null);
        setRootPath(null);
        setActiveFolderRoot(null);
        setRecentFiles([]);
        setStatusMessage(null);
        setError(err instanceof Error ? err.message : "Failed to open folder");
      } finally {
        setOpening(false);
        setStatusMessage(null);
      }
    },
    [loadIndex, rememberFolder],
  );

  useEffect(() => {
    const refreshRecentFiles = () => {
      if (!rootPath) {
        setRecentFiles([]);
        return;
      }
      setRecentFiles(loadRecentFiles(rootPath));
    };
    refreshRecentFiles();
    window.addEventListener(RECENT_FILES_CHANGED_EVENT, refreshRecentFiles);
    return () => {
      window.removeEventListener(RECENT_FILES_CHANGED_EVENT, refreshRecentFiles);
    };
  }, [rootPath]);

  useEffect(() => {
    if (!shouldRestoreFolder()) return;
    const path = loadLastFolder();
    if (!path) return;
    void openFolderAt(path);
  }, [openFolderAt]);

  const handleOpen = async () => {
    if (!folderPath.trim()) {
      setError("Enter an absolute folder path or browse");
      return;
    }
    await openFolderAt(folderPath.trim());
  };

  const handleBrowse = async () => {
    setOpening(true);
    setError(null);
    try {
      const result = await browseFolder();
      if ("cancelled" in result) return;
      await openFolderAt(result.path);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Folder picker unavailable — install zenity or enter a path manually",
      );
    } finally {
      setOpening(false);
    }
  };

  const handleRecentFolderSelect = (path: string) => {
    setFolderPath(path);
    void openFolderAt(path);
    setRecentFoldersOpen(false);
  };

  const handleClearRecentFolders = () => {
    clearRecentFolders();
    setRecentFolders([]);
    setRecentFoldersOpen(false);
  };

  return (
    <aside className="pointer-events-auto flex h-full w-80 shrink-0 flex-col overflow-visible border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="pointer-events-auto relative z-30 flex shrink-0 flex-col gap-2 overflow-visible p-3">
        <div className="flex gap-2 overflow-visible">
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
              className="size-9 shrink-0"
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
            className="min-w-0 flex-1 font-mono text-xs"
          />
        </div>
        <Button
          type="button"
          onClick={handleOpen}
          disabled={disabled || opening}
          className="w-full"
        >
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
    </aside>
  );
}
