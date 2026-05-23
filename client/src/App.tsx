import { useState, useCallback, useRef } from "react";
import Graph, { type GraphData, type GraphNode } from "./components/Graph";
import CodePanel from "./components/CodePanel";

const LARGE_PROJECT_ERROR =
  "Project too large — try a subdirectory like /src/app/features";
const CLIENT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ParseStatusResponse {
  phase: string;
  message: string;
  nodeCount: number;
  busy: boolean;
  result?: GraphData;
  error?: string;
}

function App() {
  const [repoPath, setRepoPath] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const loadGeneration = useRef(0);

  const waitForParse = async (generation: number): Promise<GraphData> => {
    const deadline = Date.now() + CLIENT_TIMEOUT_MS;

    while (true) {
      if (generation !== loadGeneration.current) {
        throw new Error("Load cancelled");
      }

      if (Date.now() > deadline) {
        throw new Error(LARGE_PROJECT_ERROR);
      }

      const statusRes = await fetch("/api/status");
      const status = (await statusRes.json()) as ParseStatusResponse;

      if (status.message) {
        setStatusText(status.message);
      }

      if (status.phase === "done" && status.result) {
        const count = status.result.nodes?.length ?? status.nodeCount;
        setStatusText(`Building graph (${count} nodes)...`);
        await sleep(0);
        return status.result;
      }

      if (status.phase === "error") {
        throw new Error(status.error ?? "Parse failed");
      }

      await sleep(POLL_INTERVAL_MS);
    }
  };

  const handleLoad = async () => {
    if (!repoPath.trim()) {
      setError("Enter an absolute path to a project directory");
      return;
    }

    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    setStatusText("Parsing files...");
    setSelectedNode(null);

    try {
      const res = await fetch(
        `/api/parse?path=${encodeURIComponent(repoPath.trim())}`,
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to start parse");
      }

      const data = await waitForParse(generation);

      if (generation !== loadGeneration.current) return;

      setStatusText("Rendering...");
      setGraphData(data);
      setStatusText("");
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      setGraphData(null);
      setError(err instanceof Error ? err.message : "Failed to load");
      setStatusText("");
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false);
      }
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
          padding: "12px 16px",
          borderBottom: "1px solid #333",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLoad()}
            placeholder="/absolute/path/to/project"
            disabled={loading}
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
            Load
          </button>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            color: "#888",
          }}
        >
          Tip: For large projects, point to a subfolder like /src/app/features
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
