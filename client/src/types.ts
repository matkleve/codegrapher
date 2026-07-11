export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method" | "module";
  label: string;
  filePath: string;
  code: string;
  /** 1-based line in the source file where `code` (full text, incl. leading comments) begins. */
  startLine?: number;
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

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated?: boolean;
  focusFile?: string;
  symbols?: Record<string, SymbolEntry[]>;
  symbolCount?: number;
}

export interface TreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
}

export interface TreeResponse {
  path: string;
  entries: TreeEntry[];
}

export type SymbolKind =
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "property"
  | "param"
  | "local";

/**
 * `enclosingSymbol` is the owning declaration's graph-node id (`GraphNode.id` format),
 * present for scoped kinds (method, property, param, local). See
 * docs/specs/service/parser-index.md.
 */
export type SymbolEntry = {
  filePath: string;
  kind: SymbolKind;
  line: number;
  enclosingSymbol?: string;
};

export type ProjectIndexResponse = {
  folderPath: string;
  symbolCount: number;
  referenceCount?: number;
  symbols: Record<string, SymbolEntry[]>;
  references?: Record<string, ReferenceEntry[]>;
};

export type ReferenceEntry = {
  filePath: string;
  line: number;
};
