import { useCallback, useEffect, useState } from "react";
import { browseFolder, fetchTree } from "@/api";
import { useIndex } from "@/context/IndexContext";
import {
  clearRecentFolders,
  loadRecentFolders,
  prependRecentFolder,
} from "@/lib/recentFolders";
import { loadLastFolder, saveLastFolder, shouldRestoreFolder } from "@/lib/lastSession";
import {
  loadRecentFiles,
  loadRecentSectionOpen,
  prependRecentFile,
  RECENT_FILES_CHANGED_EVENT,
  saveRecentSectionOpen,
  setActiveFolderRoot,
} from "@/lib/recentFiles";
import type { TreeEntry } from "@/types";

/** All folder-open, indexing, and recent-folder/file state for FileExplorer. */
export function useFolderExplorer(onFileClick: (filePath: string) => void) {
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

  const toggleRecentSection = useCallback(() => {
    setRecentSectionOpen((open) => {
      const next = !open;
      saveRecentSectionOpen(next);
      return next;
    });
  }, []);

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
      setRecentFiles(rootPath ? loadRecentFiles(rootPath) : []);
    };
    refreshRecentFiles();
    window.addEventListener(RECENT_FILES_CHANGED_EVENT, refreshRecentFiles);
    return () => window.removeEventListener(RECENT_FILES_CHANGED_EVENT, refreshRecentFiles);
  }, [rootPath]);

  useEffect(() => {
    if (!shouldRestoreFolder()) return;
    const path = loadLastFolder();
    if (path) void openFolderAt(path);
  }, [openFolderAt]);

  const handleOpen = useCallback(async () => {
    if (!folderPath.trim()) {
      setError("Enter an absolute folder path or browse");
      return;
    }
    await openFolderAt(folderPath.trim());
  }, [folderPath, openFolderAt]);

  const handleBrowse = useCallback(async () => {
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
  }, [openFolderAt]);

  const handleRecentFolderSelect = useCallback(
    (path: string) => {
      setFolderPath(path);
      void openFolderAt(path);
      setRecentFoldersOpen(false);
    },
    [openFolderAt],
  );

  const handleClearRecentFolders = useCallback(() => {
    clearRecentFolders();
    setRecentFolders([]);
    setRecentFoldersOpen(false);
  }, []);

  return {
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
  };
}
