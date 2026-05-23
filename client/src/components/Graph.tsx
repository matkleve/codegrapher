import { useEffect, useRef, type CSSProperties } from "react";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method";
  label: string;
  filePath: string;
  code: string;
  loaded?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "contains" | "imports" | "calls";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated?: boolean;
}

const NODE_COLORS: Record<GraphNode["type"], string> = {
  file: "#4A90D9",
  class: "#E8A838",
  function: "#5CB85C",
  method: "#9B59B6",
};

const FIT_PADDING = 40;

function edgeId(edge: GraphEdge): string {
  return `edge:${edge.source}:${edge.target}:${edge.type}`;
}

function isLoaded(node: GraphNode, loadedNodeIds: Set<string>): boolean {
  return node.loaded !== false && loadedNodeIds.has(node.id);
}

interface GraphProps {
  data: GraphData | null;
  loadedNodeIds: Set<string>;
  graphKey: number;
  onNodeSelect: (node: GraphNode) => void;
}

const controlButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid #555",
  borderRadius: 4,
  background: "rgba(22, 33, 62, 0.92)",
  color: "#eee",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function Graph({
  data,
  loadedNodeIds,
  graphKey,
  onNodeSelect,
}: GraphProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const prevGraphKeyRef = useRef(-1);

  const fitGraph = () => {
    const cy = cyRef.current;
    if (!cy || cy.elements().length === 0) return;
    cy.fit(undefined, FIT_PADDING);
  };

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    const next = cy.zoom() * factor;
    cy.zoom({
      level: Math.min(4, Math.max(0.1, next)),
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#fff",
            "font-size": "12px",
            "text-wrap": "wrap",
            "text-max-width": "80px",
            width: 56,
            height: 56,
            "background-opacity": 0.95,
          },
        },
        {
          selector: "node[loaded = 'true']",
          style: {
            "border-width": 3,
            "border-color": "#ffffff",
            "border-style": "solid",
          },
        },
        {
          selector: "node[loaded = 'false']",
          style: {
            "border-width": 2,
            "border-color": "#cccccc",
            "border-style": "dashed",
            "background-color": "#2a2a3e",
            "background-opacity": 0.6,
            color: "#ddd",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#999",
            "target-arrow-color": "#999",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: 'edge[type = "imports"]',
          style: { "line-color": "#4A90D9", "target-arrow-color": "#4A90D9" },
        },
        {
          selector: 'edge[type = "contains"]',
          style: { "line-color": "#ccc", "target-arrow-color": "#ccc" },
        },
      ],
      layout: { name: "grid" },
    });

    cy.on("tap", "node", (evt) => {
      const nodeData = evt.target.data() as GraphNode & { id: string };
      onNodeSelect({
        id: nodeData.id,
        type: nodeData.type,
        label: nodeData.label,
        filePath: nodeData.filePath,
        code: nodeData.code,
        loaded: nodeData.loaded === "true" || nodeData.loaded === true,
      });
    });

    cyRef.current = cy;

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return () => {
        cy.destroy();
        cyRef.current = null;
      };
    }

    const observer = new ResizeObserver(() => {
      cy.resize();
    });
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [onNodeSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;

    if (graphKey !== prevGraphKeyRef.current) {
      cy.elements().remove();
      prevGraphKeyRef.current = graphKey;
    }

    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));

    const newElements: ElementDefinition[] = [];

    for (const node of data.nodes) {
      const loaded = isLoaded(node, loadedNodeIds);
      const loadedStr = loaded ? "true" : "false";

      if (existingNodeIds.has(node.id)) {
        cy.getElementById(node.id).data({
          label: node.label,
          type: node.type,
          filePath: node.filePath,
          code: node.code,
          loaded: loadedStr,
        });
        cy.getElementById(node.id).style({
          "background-color": loaded
            ? NODE_COLORS[node.type]
            : "#2a2a3e",
        });
      } else {
        newElements.push({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            filePath: node.filePath,
            code: node.code,
            loaded: loadedStr,
          },
          style: {
            "background-color": loaded ? NODE_COLORS[node.type] : "#2a2a3e",
          },
        });
      }
    }

    for (const edge of data.edges) {
      const id = edgeId(edge);
      if (!existingEdgeIds.has(id)) {
        newElements.push({
          data: {
            id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        });
      }
    }

    if (newElements.length > 0) {
      cy.add(newElements);
    }

    const layout = cy.layout({
      name: "dagre",
      rankDir: "TB",
      nodeSep: 80,
      rankSep: 100,
    });
    layout.on("layoutstop", () => {
      cy.resize();
      cy.fit(undefined, FIT_PADDING);
    });
    layout.run();
  }, [data, loadedNodeIds, graphKey]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#1a1a2e",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          title="Fit to screen"
          aria-label="Fit to screen"
          style={controlButtonStyle}
          onClick={fitGraph}
        >
          ⊡
        </button>
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          style={controlButtonStyle}
          onClick={() => zoomBy(1.25)}
        >
          +
        </button>
        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          style={controlButtonStyle}
          onClick={() => zoomBy(1 / 1.25)}
        >
          −
        </button>
      </div>
    </div>
  );
}
