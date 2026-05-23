import { useCallback, useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { browseFolder, fetchTree } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
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
  RECENT_FILES_CHANGED_EVENT,
  saveRecentSectionOpen,
} from "@/lib/recentFiles";
import { cn } from "@/lib/utils";
import type { TreeEntry } from "@/types";

const INDENT_CLASSES = ["pl-2", "pl-4", "pl-6", "pl-8", "pl-10", "pl-12"] as const;

function indentClass(depth: number): string {
  return INDENT_CLASSES[Math.min(depth, INDENT_CLASSES.length - 1)];
}

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
  /** Disables folder tree only; recent files stay clickable. */
  treeDisabled?: boolean;
}

interface FileTreeItemProps {
  filePath: string;
  name: string;
  depth: number;
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
}

function FileTreeItem({ filePath, name, depth, onFileClick, disabled }: FileTreeItemProps) {
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
        "pointer-events-auto relative z-10 flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-mono active:cursor-grabbing",
        indentClass(depth),
        "text-foreground hover:bg-accent",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      <span className="size-3 shrink-0" />
      <Codicon name={fileIcon.codicon} className={cn("size-4 shrink-0", fileIcon.colorClass)} />
      <span className="truncate">{name}</span>
    </div>
  );
}

interface TreeNodeProps {
  entry: TreeEntry;
  depth: number;
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
}

function TreeNode({ entry, depth, onFileClick, disabled }: TreeNodeProps) {
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
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={toggleFolder}
          disabled={disabled}
          className={cn(
            "pointer-events-auto h-8 w-full justify-start gap-2 px-2 text-sm font-medium",
            indentClass(depth),
            "hover:bg-accent",
          )}
        >
          <Codicon
            name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
            className="size-3 shrink-0 text-muted-foreground"
          />
          <Codicon name={folderIcon.codicon} className={cn("size-4 shrink-0", folderIcon.colorClass)} />
          <span className="truncate">{entry.name}</span>
          {loading && <span className="text-xs text-muted-foreground">…</span>}
        </Button>
        {open &&
          children?.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              disabled={disabled}
            />
          ))}
      </div>
    );
  }

  return (
    <FileTreeItem
      filePath={entry.path}
      name={entry.name}
      depth={depth}
      onFileClick={onFileClick}
      disabled={disabled}
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
    <div className="pointer-events-auto absolute top-full left-0 z-50 w-72">
      <div className="mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-md">
        <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Recent folders</p>
        <ul className="max-h-64 overflow-y-auto py-1">
          {folders.map((path) => (
            <li key={path}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent"
                onClick={() => onSelect(path)}
              >
                <span className="block truncate text-sm font-medium">{folderDisplayName(path)}</span>
                <span className="block truncate text-xs text-muted-foreground">{path}</span>
              </button>
            </li>
          ))}
        </ul>
        <Separator />
        <div className="p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            Clear history
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RecentFilesSectionProps {
  files: string[];
  open: boolean;
  onToggle: () => void;
  onFileClick: (filePath: string) => void;
}

function RecentFilesSection({ files, open, onToggle, onFileClick }: RecentFilesSectionProps) {
  if (files.length === 0) return null;

  return (
    <section className="pointer-events-auto relative z-10 shrink-0">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="pointer-events-auto h-8 w-full justify-start gap-2 px-2 text-xs font-medium text-muted-foreground hover:bg-accent"
        aria-expanded={open}
      >
        <Codicon
          name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
          className="size-3 shrink-0"
        />
        <span>Recent</span>
        <span className="ml-auto text-muted-foreground">{files.length}</span>
      </Button>
      {open &&
        files.map((path) => (
          <FileTreeItem
            key={path}
            filePath={path}
            name={fileDisplayName(path)}
            depth={0}
            onFileClick={onFileClick}
          />
        ))}
      <Separator className="my-1 bg-sidebar-border" />
    </section>
  );
}

export default function FileExplorer({ onFileClick, treeDisabled: disabled }: FileExplorerProps) {
  const [folderPath, setFolderPath] = useState(() => loadLastFolder() ?? "");
  const [rootEntries, setRootEntries] = useState<TreeEntry[] | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [recentFolders, setRecentFolders] = useState<string[]>(() => loadRecentFolders());
  const [recentFiles, setRecentFiles] = useState<string[]>(() => loadRecentFiles());
  const [recentFoldersOpen, setRecentFoldersOpen] = useState(false);
  const [recentSectionOpen, setRecentSectionOpen] = useState(loadRecentSectionOpen);

  const toggleRecentSection = () => {
    setRecentSectionOpen((open) => {
      const next = !open;
      saveRecentSectionOpen(next);
      return next;
    });
  };

  const rememberFolder = useCallback((path: string) => {
    setRecentFolders((prev) => prependRecentFolder(path, prev));
    saveLastFolder(path);
  }, []);

  const openFolderAt = useCallback(
    async (dirPath: string) => {
      setOpening(true);
      setError(null);
      try {
        const data = await fetchTree(dirPath);
        setFolderPath(data.path);
        setRootPath(data.path);
        setRootEntries(data.entries);
        rememberFolder(data.path);
      } catch (err) {
        setRootEntries(null);
        setRootPath(null);
        setError(err instanceof Error ? err.message : "Failed to open folder");
      } finally {
        setOpening(false);
      }
    },
    [rememberFolder],
  );

  useEffect(() => {
    const refreshRecentFiles = () => setRecentFiles(loadRecentFiles());
    window.addEventListener(RECENT_FILES_CHANGED_EVENT, refreshRecentFiles);
    return () => window.removeEventListener(RECENT_FILES_CHANGED_EVENT, refreshRecentFiles);
  }, []);

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
    <aside className="pointer-events-auto flex h-full w-80 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="pointer-events-auto relative z-10 flex flex-col gap-2 p-3">
        <div className="flex gap-2">
          <div
            className="pointer-events-auto relative shrink-0"
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
          {opening ? "Opening…" : "Open"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="pointer-events-auto min-h-0 flex-1">
        <div className="pointer-events-auto py-1">
          <RecentFilesSection
            files={recentFiles}
            open={recentSectionOpen}
            onToggle={toggleRecentSection}
            onFileClick={onFileClick}
          />

          {rootPath && (
            <p className="break-all px-3 py-2 text-xs text-muted-foreground">{rootPath}</p>
          )}
          {rootEntries?.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              onFileClick={onFileClick}
              disabled={disabled}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
