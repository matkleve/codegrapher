import type { GraphNode } from "./Graph";

interface CodePanelProps {
  node: GraphNode;
  onClose: () => void;
}

export default function CodePanel({ node, onClose }: CodePanelProps) {
  return (
    <aside
      style={{
        width: 400,
        flexShrink: 0,
        borderLeft: "1px solid #333",
        background: "#16213e",
        color: "#eee",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{node.label}</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
            {node.type}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#888",
              marginTop: 4,
              wordBreak: "break-all",
            }}
          >
            {node.filePath}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid #555",
            color: "#ccc",
            borderRadius: 4,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </header>
      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: 16,
          overflow: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {node.code}
      </pre>
    </aside>
  );
}
