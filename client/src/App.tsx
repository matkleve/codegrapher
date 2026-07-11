import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFileGraph, fetchFocus } from "@/api";
import FileExplorer from "@/components/FileExplorer";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import GraphCanvas, { type GraphCanvasHandle } from "@/components/GraphCanvas";
import { CtrlKeyProvider } from "@/context/CtrlKeyContext";
import { IndexProvider, useIndex } from "@/context/IndexContext";
import { mergeGraphData } from "@/graphMerge";
import { loadLastFile, saveLastFile, shouldRestoreFile } from "@/lib/lastSession";
import { collectGraphFilePaths } from "@/lib/graphFiles";
import { getActiveFolderRoot, recordRecentFile } from "@/lib/recentFiles";
import type { GraphData } from "@/types";

function AppContent() {
  const { mergeSymbols } = useIndex();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphResetKey, setGraphResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const loadFileGraph = useCallback(async (filePath: string, replace = true) => {
    setLoading(true);
    setError(null);
    recordRecentFile(filePath, getActiveFolderRoot());
    try {
      const data = await fetchFileGraph(filePath);
      graphRef.current?.pushHistoryBeforeChange();
      if (replace) {
        setGraphResetKey((k) => k + 1);
      }
      setGraphData(data);
      saveLastFile(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileClick = useCallback(
    (filePath: string) => loadFileGraph(filePath, true),
    [loadFileGraph],
  );

  const mergeFocusFileIntoGraph = useCallback(
    async (filePath: string, errorMessage: string) => {
      const normalized = filePath.trim();
      if (!normalized) return;
      setLoading(true);
      setError(null);
      recordRecentFile(normalized, getActiveFolderRoot());
      try {
        const incoming = await fetchFocus(normalized, 1);
        if (incoming.symbols) mergeSymbols(incoming.symbols);
        graphRef.current?.pushHistoryBeforeChange();
        setGraphData((prev) => mergeGraphData(prev, incoming));
        saveLastFile(normalized);
      } catch (err) {
        setError(err instanceof Error ? err.message : errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [mergeSymbols],
  );

  const handleFileDrop = useCallback(
    (filePath: string) =>
      mergeFocusFileIntoGraph(filePath, "Failed to merge file"),
    [mergeFocusFileIntoGraph],
  );

  const handleLoadFileIntoGraph = useCallback(
    (filePath: string) =>
      mergeFocusFileIntoGraph(filePath, "Failed to load file into graph"),
    [mergeFocusFileIntoGraph],
  );

  useEffect(() => {
    if (!shouldRestoreFile()) return;
    const path = loadLastFile();
    if (!path) return;
    void loadFileGraph(path, true);
  }, [loadFileGraph]);

  const graphFilePaths = useMemo(() => collectGraphFilePaths(graphData), [graphData]);

  return (
    <CtrlKeyProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <ResizableSidebar>
          <FileExplorer
            onFileClick={handleFileClick}
            treeDisabled={loading}
            graphFilePaths={graphFilePaths}
          />
        </ResizableSidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          {error && (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <GraphCanvas
            ref={graphRef}
            graphData={graphData}
            graphResetKey={graphResetKey}
            onFileDrop={handleFileDrop}
            onLoadFile={handleLoadFileIntoGraph}
            loading={loading}
          />
        </div>
      </div>
    </CtrlKeyProvider>
  );
}

function App() {
  return (
    <IndexProvider>
      <AppContent />
    </IndexProvider>
  );
}

export default App;
