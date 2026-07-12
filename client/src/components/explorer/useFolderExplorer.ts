import { useCallback, useEffect, useRef, useState } from "react";
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
import { formatExplorerError } from "@/lib/explorerErrors";
import type { TreeEntry } from "@/types";

/** All folder-open, indexing, and recent-folder/file state for FileExplorer. */
export function useFolderExplorer(
  onFileClick: (filePath: string) => void,
  onFolderOpened?: (folderPath: string) => void,
) {
  const openSeqRef = useRef(0);
  const [folderPath, setFolderPath] = useState(() => loadLastFolder() ?? "");
  const [rootEntries, setRootEntries] = useState<TreeEntry[] | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { loadIndex, indexing, indexStatus } = useIndex();
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
    async (dirPath: string): Promise<string | null> => {
      const seq = ++openSeqRef.current;
      setOpening(true);
      setError(null);
      setStatusMessage(null);
      let phase: "index" | "tree" = "index";
      try {
        await loadIndex(dirPath);
        if (seq !== openSeqRef.current) return null;

        phase = "tree";
        const data = await fetchTree(dirPath);
        if (seq !== openSeqRef.current) return null;

        setFolderPath(data.path);
        setRootPath(data.path);
        setRootEntries(data.entries);
        setActiveFolderRoot(data.path);
        setRecentFiles(loadRecentFiles(data.path));
        rememberFolder(data.path);
        return data.path;
      } catch (err) {
        if (seq !== openSeqRef.current) return null;
        setRootEntries(null);
        setRootPath(null);
        setActiveFolderRoot(null);
        setRecentFiles([]);
        setStatusMessage(null);
        setError(formatExplorerError(err, { folderPath: dirPath, phase }));
        return null;
      } finally {
        if (seq === openSeqRef.current) {
          setOpening(false);
          setStatusMessage(null);
        }
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

  const notifyFolderOpened = useCallback(
    (path: string | null) => {
      if (path) onFolderOpened?.(path);
    },
    [onFolderOpened],
  );

  const handleOpen = useCallback(async () => {
    if (!folderPath.trim()) {
      setError(formatExplorerError("Enter an absolute folder path or browse"));
      return;
    }
    const opened = await openFolderAt(folderPath.trim());
    notifyFolderOpened(opened);
  }, [folderPath, notifyFolderOpened, openFolderAt]);

  const handleBrowse = useCallback(async () => {
    setError(null);
    try {
      const result = await browseFolder();
      if ("cancelled" in result) return;
      setFolderPath(result.path);
      const opened = await openFolderAt(result.path);
      notifyFolderOpened(opened);
    } catch (err) {
      setError(formatExplorerError(err, { phase: "browse" }));
    }
  }, [notifyFolderOpened, openFolderAt]);

  const handleRecentFolderSelect = useCallback(
    (path: string) => {
      setFolderPath(path);
      void openFolderAt(path).then(notifyFolderOpened);
      setRecentFoldersOpen(false);
    },
    [notifyFolderOpened, openFolderAt],
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
    folderBusy: opening || indexing,
  };
}
