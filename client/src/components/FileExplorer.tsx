import { useCallback, useState } from "react";
import { FolderOpen } from "lucide-react";
import { browseFolder, fetchTree } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Codicon, getFileIcon, getFolderIcon } from "@/lib/fileIcons";
import { cn } from "@/lib/utils";
import type { TreeEntry } from "@/types";

const DRAG_MIME = "application/x-codegrapher-path";

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
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

  const paddingLeft = 8 + depth * 14;

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
            "h-8 w-full justify-start gap-2 px-2 font-medium",
            "hover:bg-accent",
          )}
          style={{ paddingLeft }}
        >
          <Codicon
            name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
            className="size-3 shrink-0 text-muted-foreground"
          />
          <Codicon name={folderIcon.codicon} className={cn("size-4 shrink-0", folderIcon.colorClass)} />
          <span className="truncate text-sm">{entry.name}</span>
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

  const fileIcon = getFileIcon(entry.name);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, entry.path);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => !disabled && onFileClick(entry.path)}
      onKeyDown={(e) => e.key === "Enter" && !disabled && onFileClick(entry.path)}
      className={cn(
        "flex h-8 cursor-grab items-center gap-2 rounded-md px-2 text-sm font-mono",
        "text-foreground hover:bg-accent",
        disabled && "cursor-wait opacity-50",
      )}
      style={{ paddingLeft }}
    >
      <span className="size-3 shrink-0" />
      <Codicon name={fileIcon.codicon} className={cn("size-4 shrink-0", fileIcon.colorClass)} />
      <span className="truncate">{entry.name}</span>
    </div>
  );
}

export default function FileExplorer({ onFileClick, disabled }: FileExplorerProps) {
  const [folderPath, setFolderPath] = useState("");
  const [rootEntries, setRootEntries] = useState<TreeEntry[] | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const openFolderAt = async (dirPath: string) => {
    setOpening(true);
    setError(null);
    try {
      const data = await fetchTree(dirPath);
      setFolderPath(data.path);
      setRootPath(data.path);
      setRootEntries(data.entries);
    } catch (err) {
      setRootEntries(null);
      setRootPath(null);
      setError(err instanceof Error ? err.message : "Failed to open folder");
    } finally {
      setOpening(false);
    }
  };

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

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-2 p-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleBrowse}
            disabled={disabled || opening}
            title="Browse for folder"
            aria-label="Browse for folder"
            className="size-9 shrink-0"
          >
            <FolderOpen data-icon="inline-start" />
          </Button>
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

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
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

export { DRAG_MIME };
