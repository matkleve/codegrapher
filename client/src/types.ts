export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method" | "module";
  label: string;
  filePath: string;
  code: string;
  loaded?: boolean;
  parent?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "contains" | "imports" | "calls";
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
  | "property";

export type SymbolEntry = {
  filePath: string;
  kind: SymbolKind;
  line: number;
};

export type ProjectIndexResponse = {
  folderPath: string;
  symbolCount: number;
  symbols: Record<string, SymbolEntry[]>;
};
