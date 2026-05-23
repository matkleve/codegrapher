import { ClassNode } from "@/components/nodes/ClassNode";
import { FileNode } from "@/components/nodes/FileNode";

export const flowNodeTypes = {
  class: ClassNode,
  file: FileNode,
} as const;

export type { ClassNodeData, FileNodeData, FlowSnapshot, MethodItem } from "@/components/nodes/flowNodeData";
