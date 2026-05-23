import { useState, useCallback } from "react";
import Graph, { type GraphData, type GraphNode } from "./components/Graph";
import CodePanel from "./components/CodePanel";

function App() {
  const [repoPath, setRepoPath] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    if (!repoPath.trim()) {
      setError("Enter an absolute path to a project directory");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedNode(null);

    try {
      const res = await fetch(
        `/api/parse?path=${encodeURIComponent(repoPath.trim())}`,
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to parse project");
      }
      setGraphData(body as GraphData);
    } catch (err) {
      setGraphData(null);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleNodeSelect = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

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
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid #333",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          placeholder="/absolute/path/to/project"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 4,
            border: "1px solid #444",
            background: "#1a1a2e",
            color: "#eee",
            fontSize: 14,
          }}
        />
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
          {loading ? "Loading…" : "Load"}
        </button>
      </header>

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
          <Graph data={graphData} onNodeSelect={handleNodeSelect} />
        </main>
        {selectedNode && (
          <CodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}

export default App;
