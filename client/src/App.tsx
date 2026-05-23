import { useState, useCallback } from "react";
import Graph, { type GraphData, type GraphNode } from "./components/Graph";
import CodePanel from "./components/CodePanel";
import { collectLoadedNodeIds, mergeGraphData } from "./graphMerge";

async function fetchFocus(filePath: string, depth: number): Promise<GraphData> {
  const res = await fetch(
    `/api/focus?path=${encodeURIComponent(filePath)}&depth=${depth}`,
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to load focus");
  }
  return body as GraphData;
}

function App() {
  const [startFile, setStartFile] = useState("");
  const [depth, setDepth] = useState(2);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadedNodeIds, setLoadedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [graphKey, setGraphKey] = useState(0);

  const applyFocusResult = useCallback((incoming: GraphData, replace: boolean) => {
    setGraphData((prev) => {
      const merged = replace ? incoming : mergeGraphData(prev, incoming);
      setLoadedNodeIds(collectLoadedNodeIds(merged));
      if (replace) {
        setGraphKey((k) => k + 1);
      }
      return merged;
    });
  }, []);

  const handleLoad = async () => {
    if (!startFile.trim()) {
      setError("Enter an absolute path to a starting .ts or .tsx file");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusText("Loading focus neighborhood...");
    setSelectedNode(null);

    try {
      const data = await fetchFocus(startFile.trim(), depth);
      setStatusText(`Rendering ${data.nodes.length} nodes...`);
      applyFocusResult(data, true);
      setStatusText("");
    } catch (err) {
      setGraphData(null);
      setLoadedNodeIds(new Set());
      setError(err instanceof Error ? err.message : "Failed to load");
      setStatusText("");
    } finally {
      setLoading(false);
    }
  };

  const expandFromNode = useCallback(
    async (node: GraphNode) => {
      setLoading(true);
      setError(null);
      setStatusText(`Expanding ${node.filePath}...`);

      try {
        const data = await fetchFocus(node.filePath, depth);
        setStatusText(`Merging ${data.nodes.length} nodes...`);
        applyFocusResult(data, false);
        setStatusText("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to expand");
        setStatusText("");
      } finally {
        setLoading(false);
      }
    },
    [depth, applyFocusResult],
  );

  const handleNodeSelect = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      void expandFromNode(node);
    },
    [expandFromNode],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#0f0f1a",
        color: "#eee",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #333",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={startFile}
            onChange={(e) => setStartFile(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLoad()}
            placeholder="/path/to/app.component.ts"
            disabled={loading}
            style={{
              flex: "1 1 280px",
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#1a1a2e",
              color: "#eee",
              fontSize: 14,
            }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#aaa",
            }}
          >
            Depth
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              disabled={loading}
            />
            <span style={{ minWidth: 16, color: "#eee" }}>{depth}</span>
          </label>
          <button
            type="button"
            onClick={handleLoad}
            disabled={loading}
            style={{
              padding: "8px 20px",
              borderRadius: 4,
              border: "none",
              background: "#4A90D9",
              color: "#fff",
              cursor: loading ? "wait" : "pointer",
              fontWeight: 600,
            }}
          >
            Load
          </button>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>
          Enter a starting file — click nodes to expand imports into the graph
        </p>
      </header>

      {statusText && (
        <div
          style={{
            padding: "6px 16px",
            fontSize: 13,
            color: "#9ab",
            borderBottom: "1px solid #333",
            background: "#12121f",
          }}
        >
          {statusText}
        </div>
      )}

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

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            display: "flex",
          }}
        >
          <Graph
            data={graphData}
            loadedNodeIds={loadedNodeIds}
            graphKey={graphKey}
            onNodeSelect={handleNodeSelect}
          />
        </main>
        {selectedNode && selectedNode.loaded !== false && selectedNode.code && (
          <CodePanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
