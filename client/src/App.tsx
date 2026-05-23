import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFileGraph } from "@/api";
import FileExplorer from "@/components/FileExplorer";
import GraphCanvas, { type GraphCanvasHandle } from "@/components/GraphCanvas";
import { mergeGraphData } from "@/graphMerge";
import { loadLastFile, saveLastFile, shouldRestoreFile } from "@/lib/lastSession";
import { collectGraphFilePaths } from "@/lib/graphFiles";
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

  const handleFileDrop = useCallback(async (filePath: string) => {
    const normalized = filePath.trim();
    if (!normalized) return;
    setLoading(true);
    setError(null);
    recordRecentFile(normalized);
    try {
      const incoming = await fetchFileGraph(normalized);
      graphRef.current?.pushHistoryBeforeChange();
      setGraphData((prev) => mergeGraphData(prev, incoming));
      saveLastFile(normalized);
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

  const graphFilePaths = useMemo(() => collectGraphFilePaths(graphData), [graphData]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <FileExplorer
        onFileClick={handleFileClick}
        treeDisabled={loading}
        graphFilePaths={graphFilePaths}
      />

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
          loading={loading}
        />
      </div>
    </div>
  );
}

export default App;
