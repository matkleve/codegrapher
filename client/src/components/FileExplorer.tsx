import { useCallback, useState } from "react";
import { browseFolder, fetchTree } from "../api";
import type { TreeEntry } from "../types";

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
    return (
      <div>
        <button
          type="button"
          onClick={toggleFolder}
          disabled={disabled}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            padding: "4px 8px",
            paddingLeft,
            border: "none",
            background: "transparent",
            color: "#ccc",
            cursor: disabled ? "wait" : "pointer",
            fontSize: 13,
            textAlign: "left",
          }}
        >
          <span style={{ width: 12 }}>{open ? "▼" : "▶"}</span>
          <span>📁</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</span>
          {loading && <span style={{ fontSize: 11, color: "#888" }}>…</span>}
        </button>
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        paddingLeft,
        fontSize: 13,
        color: "#9cf",
        cursor: disabled ? "wait" : "grab",
        userSelect: "none",
      }}
    >
      <span style={{ width: 12 }} />
      <span>📄</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</span>
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
      setError("Enter an absolute folder path or use Browse");
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
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #333",
        background: "#12121f",
        height: "100%",
      }}
    >
      <div style={{ padding: 12, borderBottom: "1px solid #333" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 8,
            alignItems: "stretch",
          }}
        >
          <button
            type="button"
            onClick={handleBrowse}
            disabled={disabled || opening}
            title="Browse for folder"
            aria-label="Browse for folder"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              padding: 0,
              borderRadius: 4,
              border: "1px solid #555",
              background: "#1a1a2e",
              color: "#eee",
              fontSize: 18,
              lineHeight: 1,
              cursor: disabled || opening ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            📂
          </button>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpen()}
            placeholder="/absolute/path/to/project"
            disabled={disabled || opening}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#1a1a2e",
              color: "#eee",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled || opening}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: 4,
            border: "none",
            background: "#4A90D9",
            color: "#fff",
            fontWeight: 600,
            cursor: disabled || opening ? "wait" : "pointer",
          }}
        >
          {opening ? "Opening…" : "Open"}
        </button>
        {error && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#f88" }}>{error}</p>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {rootPath && (
          <div
            style={{
              fontSize: 11,
              color: "#666",
              padding: "4px 12px 8px",
              wordBreak: "break-all",
            }}
          >
            {rootPath}
          </div>
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
    </div>
  );
}

export { DRAG_MIME };
