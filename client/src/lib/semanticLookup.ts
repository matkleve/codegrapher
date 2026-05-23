import { toFlowId } from "@/lib/graphIds";
import {
  symbolKindToSemantic,
  type SemanticTokenKind,
} from "@/lib/tokenColors";
import type { GraphData, GraphNode, SymbolEntry } from "@/types";

export type TokenReference = {
  graphNodeId?: string;
  flowNodeId?: string;
  classLabel: string;
  memberLabel?: string;
  line: number;
  filePath: string;
  kind: SemanticTokenKind;
  inGraph: boolean;
};

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

function graphNodeForEntry(
  entry: SymbolEntry,
  token: string,
  graphData: GraphData,
): GraphNode | undefined {
  const file = normalizePath(entry.filePath);
  for (const node of graphData.nodes) {
    if (normalizePath(node.filePath) !== file) continue;
    if (entry.kind === "method" && node.type === "method" && node.label === token) {
      return node;
    }
    if (
      (entry.kind === "class" || entry.kind === "interface") &&
      (node.type === "class" || node.type === "module") &&
      node.label === token
    ) {
      return node;
    }
    if (entry.kind === "function" && node.type === "function" && node.label === token) {
      return node;
    }
    if (
      entry.kind === "type" &&
      (node.type === "class" || node.type === "module") &&
      node.label === token
    ) {
      return node;
    }
  }

  for (const node of graphData.nodes) {
    if (normalizePath(node.filePath) !== file) continue;
    if (node.label === token) return node;
  }

  return undefined;
}

function flowIdForGraphNode(node: GraphNode, graphData: GraphData): string {
  if (node.type === "method" || (node.type === "function" && node.parent)) {
    const parent = graphData.nodes.find((n) => n.id === node.parent);
    if (parent && (parent.type === "class" || parent.type === "module")) {
      return toFlowId(parent.id);
    }
  }
  return toFlowId(node.id);
}

export function resolveFlowTargetFromIndex(
  token: string,
  sourceGraphNodeId: string,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
): { flowNodeId: string; kind: SemanticTokenKind } | null {
  if (!graphData) return null;

  const entries = symbols.get(token) ?? [];
  const sourceFlow = toFlowId(sourceGraphNodeId);

  for (const entry of entries) {
    const node = graphNodeForEntry(entry, token, graphData);
    if (!node) continue;
    const flowNodeId = flowIdForGraphNode(node, graphData);
    if (flowNodeId === sourceFlow) continue;
    return { flowNodeId, kind: symbolKindToSemantic(entry.kind) };
  }

  return null;
}

export function findSemanticReferences(
  token: string,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
): TokenReference[] {
  const entries = symbols.get(token) ?? [];
  const hits: TokenReference[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const key = `${entry.filePath}:${entry.line}:${entry.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const kind = symbolKindToSemantic(entry.kind);
    let graphNode: GraphNode | undefined;
    let flowNodeId: string | undefined;
    let classLabel = token;
    let memberLabel: string | undefined;
    let inGraph = false;

    if (graphData) {
      graphNode = graphNodeForEntry(entry, token, graphData);
      if (graphNode) {
        inGraph = true;
        flowNodeId = flowIdForGraphNode(graphNode, graphData);
        if (graphNode.type === "method") {
          const parent = graphData.nodes.find((n) => n.id === graphNode!.parent);
          classLabel = parent?.label ?? token;
          memberLabel = graphNode.label;
        } else {
          classLabel = graphNode.label;
        }
      }
    }

    hits.push({
      graphNodeId: graphNode?.id,
      flowNodeId,
      classLabel,
      memberLabel,
      line: entry.line,
      filePath: entry.filePath,
      kind,
      inGraph,
    });
  }

  return hits;
}

export function countIndexOccurrencesInFile(
  token: string,
  filePath: string,
  symbols: Map<string, SymbolEntry[]>,
): number {
  const file = normalizePath(filePath);
  return (symbols.get(token) ?? []).filter((e) => normalizePath(e.filePath) === file)
    .length;
}
