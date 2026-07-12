import { useCallback, useState, type ReactNode } from "react";
import { fetchTree } from "@/api";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import {
  EXPLORER_FILE_ROW,
  EXPLORER_FOLDER_ROW,
} from "@/components/explorer/explorerRowStyles";
import { Codicon, getFileIcon, getFolderIcon } from "@/lib/fileIcons";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { isFileInGraph } from "@/lib/graphFiles";
import { cn } from "@/lib/utils";
import type { TreeEntry } from "@/types";

/** Vertical guide + indent for nested files under a folder/section. */
export function ExplorerTreeGuide({ children }: { children: ReactNode }) {
  return (
    <div className="explorer-tree-guide ml-3 border-l border-sidebar-border pl-2">
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

type FileTreeItemProps = {
  filePath: string;
  name: string;
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
  inGraph?: boolean;
};

/** A draggable, clickable file row. */
export function FileTreeItem({
  filePath,
  name,
  onFileClick,
  disabled,
  inGraph,
}: FileTreeItemProps) {
  const fileIcon = getFileIcon(name);

  return (
    <InteractiveListRow
      as="div"
      density="compact"
      mono
      title={name}
      disabled={disabled}
      draggable={!disabled}
      className={cn(EXPLORER_FILE_ROW, inGraph && "explorer-file-in-graph")}
      leading={
        fileIcon.vscodeIcon ? (
          <VscodeFileIcon icon={fileIcon.vscodeIcon} size={14} />
        ) : (
          <Codicon name={fileIcon.codicon!} className={cn("shrink-0", fileIcon.colorClass)} />
        )
      }
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
    />
  );
}

type TreeNodeProps = {
  entry: TreeEntry;
  depth: number;
  onFileClick: (filePath: string) => void;
  disabled?: boolean;
  graphFilePaths?: Set<string>;
};

/** Recursive folder/file node; folders lazy-load their children on first open. */
export function TreeNode({
  entry,
  depth,
  onFileClick,
  disabled,
  graphFilePaths,
}: TreeNodeProps) {
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
        <InteractiveListRow
          density="compact"
          title={entry.name}
          disabled={disabled}
          aria-expanded={open}
          className={cn(EXPLORER_FOLDER_ROW, "py-0 font-medium")}
          leading={
            <>
              <Codicon
                name={open ? "codicon-chevron-down" : "codicon-chevron-right"}
                className="shrink-0 text-muted-foreground"
              />
              <Codicon name={folderIcon.codicon} className={cn("shrink-0", folderIcon.colorClass)} />
            </>
          }
          trailing={
            loading ? (
              <span className="control-row-text-secondary">…</span>
            ) : null
          }
          onClick={toggleFolder}
        />
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

  const item = (
    <FileTreeItem
      filePath={entry.path}
      name={entry.name}
      onFileClick={onFileClick}
      disabled={disabled}
      inGraph={isFileInGraph(entry.path, graphFilePaths ?? new Set())}
    />
  );

  return depth === 0 ? <ExplorerTreeGuide>{item}</ExplorerTreeGuide> : item;
}
