import { useCallback, useRef, useState } from "react";
import { fetchFileGraph, fetchFocus } from "@/api";
import FileExplorer from "@/components/FileExplorer";
import GraphCanvas, { type GraphCanvasHandle } from "@/components/GraphCanvas";
import { mergeGraphData } from "@/graphMerge";
import type { GraphData } from "@/types";

function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphResetKey, setGraphResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const handleFileClick = useCallback(async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFileGraph(filePath);
      graphRef.current?.pushHistoryBeforeChange();
      setGraphResetKey((k) => k + 1);
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileDrop = useCallback(async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const incoming = await fetchFocus(filePath, 1);
      graphRef.current?.pushHistoryBeforeChange();
      setGraphData((prev) => mergeGraphData(prev, incoming));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge file");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <FileExplorer onFileClick={handleFileClick} disabled={loading} />

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
