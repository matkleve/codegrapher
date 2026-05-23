import type { Edge, Node } from "@xyflow/react";

export type MethodItem = {
  id: string;
  label: string;
  code: string;
};

export type ClassNodeData = {
  label: string;
  filePath: string;
  graphNodeId: string;
  nodeKind: "class" | "module" | "function";
  methods: MethodItem[];
  expandedMethodIds: string[];
  selected?: boolean;
  pathHighlighted?: boolean;
};

export type FileNodeData = {
  label: string;
  filePath: string;
  graphNodeId: string;
  selected?: boolean;
  pathHighlighted?: boolean;
};

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
};
