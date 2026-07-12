import { Node } from "ts-morph";

export const MAX_FOCUS_NODES = 50;

export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method" | "module";
  label: string;
  filePath: string;
  code: string;
  /** 1-based line in `filePath` where `code` (full text, incl. leading comments) begins. */
  startLine: number;
  loaded?: boolean;
  parent?: string;
}

export type StructuralEdgeType =
  | "extends"
  | "implements"
  | "composition"
  | "imports";

export interface GraphEdge {
  source: string;
  target: string;
  type: "contains" | "imports" | "calls" | StructuralEdgeType;
  label?: string;
}

export interface FocusResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated?: boolean;
  focusFile: string;
}

/** Graph-node id conventions shared with the symbol index (`indexer.ts` enclosingSymbol). */
export function classNodeId(filePath: string, className: string): string {
  return `class:${filePath}:${className}`;
}

export function methodNodeId(filePath: string, className: string, methodName: string): string {
  return `method:${filePath}:${className}.${methodName}`;
}

export function functionNodeId(filePath: string, name: string): string {
  return `function:${filePath}:${name}`;
}

/** Line where `node.getFullText()` begins — aligns gutter numbers with `code` verbatim. */
export function fullTextStartLine(node: Node): number {
  return node.getSourceFile().getLineAndColumnAtPos(node.getFullStart()).line;
}
