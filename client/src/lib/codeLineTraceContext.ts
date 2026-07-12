import type { LexicalGraph } from "@/lib/lexicalGraph";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { SymbolEntry, GraphData } from "@/types";
import type { Node } from "@xyflow/react";

export type CodeLineTraceContext = {
  name: string;
  chipEl: HTMLElement;
  kind: SemanticTokenKind;
  tokenIndex: number;
  edgeKey: string;
  symbolIndex: MemberSymbolIndex;
  controlFlowIndex: ControlFlowIndex;
  sourceFlowId: string;
  memberId: string;
  lineNumber: number;
  methodCode?: string;
  methodStartLine?: number;
  symbols: Map<string, SymbolEntry[]>;
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  hasSymbol: (name: string) => boolean;
  lookup: (name: string) => SymbolEntry | undefined;
  cascadeEdges: PreviewEdgeSpec[];
  lexicalGraph?: LexicalGraph;
};
