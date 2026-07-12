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
 * `enclosingSymbol` is the owning declaration's graph-node id (same id format as
 * `GraphNode.id` — see `classNodeId`/`methodNodeId`/`functionNodeId` in parser.ts).
 */
export type SymbolEntry = {
  filePath: string;
  kind: SymbolKind;
  line: number;
  enclosingSymbol?: string;
};

export type ProjectIndex = {
  folderPath: string;
  symbolCount: number;
  referenceCount: number;
  symbols: Map<string, SymbolEntry[]>;
  references: Map<string, import("./referenceIndexer").ReferenceEntry[]>;
};

export type IndexProgressEvent =
  | { phase: "loading" }
  | { phase: "preparing"; total: number }
  | { phase: "files"; done: number; total: number; currentFile?: string }
  | { phase: "references"; filesTotal: number };
