import type { Edge, Node } from "@xyflow/react";
import type { FlowSnapshot } from "@/components/nodes/flowNodeTypes";

export function cloneFlowSnapshot(
  nodes: Node[],
  edges: Edge[],
  viewport: { x: number; y: number; zoom: number },
): FlowSnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    viewport: { ...viewport },
  };
}
