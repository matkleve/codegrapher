import type { Edge, Node } from "@xyflow/react";

export type MemberItem = {
  id: string;
  label: string;
  code: string;
};

export type MethodItem = MemberItem;

export type ClassNodeData = {
  /** Class / function / module name */
  label: string;
  /** Basename shown in header, e.g. query.ts */
  fileName: string;
  filePath: string;
  graphNodeId: string;
  nodeKind: "class" | "module" | "function";
  properties: MemberItem[];
  methods: MethodItem[];
  expandedPropertyIds: string[];
  expandedMethodIds: string[];
  propertiesSectionCollapsed?: boolean;
  methodsSectionCollapsed?: boolean;
  collapsed?: boolean;
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
