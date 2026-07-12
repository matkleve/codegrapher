import { useCallback, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import {
  applyPathHighlight,
  clearPathHighlight,
  findShortestPath,
} from "@/lib/graphPathHighlight";

type NodeContextMenu = {
  x: number;
  y: number;
  nodeId: string;
};

type UseGraphPathModeOptions = {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
};

export function useGraphPathMode({
  nodes,
  edges,
  setNodes,
  setEdges,
}: UseGraphPathModeOptions) {
  const pathFromIdRef = useRef<string | null>(null);
  const [pathInfo, setPathInfo] = useState<string | null>(null);
  const [pathFromId, setPathFromId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<NodeContextMenu | null>(null);

  pathFromIdRef.current = pathFromId;

  const clearPathMode = useCallback(() => {
    setPathInfo(null);
    setPathFromId(null);
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const fromId = pathFromIdRef.current;
      if (fromId) {
        const path = findShortestPath(edges, fromId, node.id);
        setPathFromId(null);
        if (path) {
          const highlighted = applyPathHighlight(
            nodes,
            edges,
            path.nodeIds,
            path.edgeIds,
          );
          setNodes(highlighted.nodes);
          setEdges(highlighted.edges);
          const labels = path.nodeIds.map((id) => {
            const n = nodes.find((x) => x.id === id);
            if (!n) return id;
            return (n.data as ClassNodeData).label ?? id;
          });
          setPathInfo(`Path: ${labels.join(" → ")}`);
        } else {
          setPathInfo("No path found between nodes");
        }
        return;
      }

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id,
          data: {
            ...n.data,
            selected: n.id === node.id,
          },
        })),
      );
      setContextMenu(null);
    },
    [edges, nodes, setEdges, setNodes],
  );

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    if (!pathFromIdRef.current) setPathInfo(null);
  }, []);

  const startPathFrom = useCallback(
    (nodeId: string) => {
      setPathFromId(nodeId);
      setContextMenu(null);
      setPathInfo(null);
      const cleared = clearPathHighlight(nodes, edges);
      setNodes(cleared.nodes);
      setEdges(cleared.edges);
    },
    [edges, nodes, setEdges, setNodes],
  );

  return {
    pathInfo,
    pathFromId,
    contextMenu,
    clearPathMode,
    onNodeClick,
    onNodeContextMenu,
    onPaneClick,
    startPathFrom,
  };
}
