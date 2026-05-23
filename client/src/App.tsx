import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFileGraph, fetchFocus } from "@/api";
import FileExplorer from "@/components/FileExplorer";
import GraphCanvas, { type GraphCanvasHandle } from "@/components/GraphCanvas";
import { DRAG_FILEPATH_KEY } from "@/lib/drag";
import { mergeGraphData } from "@/graphMerge";
import { loadLastFile, saveLastFile, shouldRestoreFile } from "@/lib/lastSession";
import { recordRecentFile } from "@/lib/recentFiles";
import type { GraphData } from "@/types";

function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphResetKey, setGraphResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const loadFileGraph = useCallback(async (filePath: string, replace = true) => {
    setLoading(true);
    setError(null);
    recordRecentFile(filePath);
    try {
      if (replace) {
        graphRef.current?.pushHistoryBeforeChange();
        setGraphResetKey((k) => k + 1);
      } else {
        graphRef.current?.pushHistoryBeforeChange();
      }

      const data = await fetchFileGraph(filePath);
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

  const handleFileDrop = useCallback(async (filePath: string) => {
    if (!filePath.trim()) return;
    setLoading(true);
    setError(null);
    recordRecentFile(filePath);
    try {
      const incoming = await fetchFocus(filePath, 1);
      graphRef.current?.pushHistoryBeforeChange();
      setGraphData((prev) => mergeGraphData(prev, incoming));
      saveLastFile(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge file");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldRestoreFile()) return;
    const path = loadLastFile();
    if (!path) return;
    void loadFileGraph(path, true);
  }, [loadFileGraph]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const filePath =
        e.dataTransfer.getData(DRAG_FILEPATH_KEY) ||
        e.dataTransfer.getData("text/plain");
      if (filePath) void handleFileDrop(filePath);
    },
    [handleFileDrop],
  );

  return (
    <div className="pointer-events-auto flex h-screen overflow-hidden bg-background text-foreground">
      <FileExplorer onFileClick={handleFileClick} treeDisabled={loading} />

      <div
        className="pointer-events-auto flex min-w-0 flex-1 flex-col"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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
          loading={loading}
        />
      </div>
    </div>
  );
}

export default App;
