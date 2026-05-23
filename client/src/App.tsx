import { useCallback, useRef, useState } from "react";
import { fetchFileGraph, fetchFocus } from "./api";
import FileExplorer from "./components/FileExplorer";
import GraphCanvas, { type GraphCanvasHandle } from "./components/GraphCanvas";
import { mergeGraphData } from "./graphMerge";
import type { GraphData } from "./types";

function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphResetKey, setGraphResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const handleFileClick = useCallback(
    async (filePath: string) => {
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
    },
    [],
  );

  const handleFileDrop = useCallback(
    async (filePath: string) => {
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
    },
    [],
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#0f0f1a",
        color: "#eee",
        overflow: "hidden",
      }}
    >
      <FileExplorer onFileClick={handleFileClick} disabled={loading} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {error && (
          <div
            style={{
              padding: "8px 16px",
              background: "#4a1a1a",
              color: "#f88",
              fontSize: 13,
            }}
          >
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
