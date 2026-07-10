import { toFlowId } from "@/lib/graphIds";
import {
  previewLineHandle,
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import { symbolKindToSemantic, type SemanticTokenKind } from "@/lib/tokenColors";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { GraphData, GraphNode, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

export type GraphTargetLevel = "class" | "member" | "line";

export type GraphVisibleTarget = {
  mode: "graph";
  level: GraphTargetLevel;
  flowNodeId: string;
  targetHandle: string;
  label: string;
  kind: SemanticTokenKind;
  memberId?: string;
  lineNumber?: number;
};

export type ExternalReferenceCard = {
  symbolName: string;
  filePath: string;
  line: number;
  occurrenceCount: number;
};

export type VisibleTargetResult =
  | GraphVisibleTarget
  | { mode: "external"; cards: ExternalReferenceCard[] }
  | null;

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

function findMethodGraphNode(
  token: string,
  entry: SymbolEntry,
  graphData: GraphData,
): GraphNode | undefined {
  const file = normalizePath(entry.filePath);
  return graphData.nodes.find(
    (n) =>
      n.type === "method" &&
      normalizePath(n.filePath) === file &&
      n.label === token,
  );
}

function findClassGraphNode(
  token: string,
  entry: SymbolEntry,
  graphData: GraphData,
): GraphNode | undefined {
  const file = normalizePath(entry.filePath);
  return graphData.nodes.find(
    (n) =>
      (n.type === "class" || n.type === "module") &&
      normalizePath(n.filePath) === file &&
      n.label === token,
  );
}

function findMemberId(
  methodNode: GraphNode,
  classData: ClassNodeData,
): string | undefined {
  const byId = classData.methods.find((m) => m.id === methodNode.id);
  if (byId) return byId.id;
  return classData.methods.find((m) => m.label === methodNode.label)?.id;
}

export function buildExternalReferenceCards(
  token: string,
  symbols: Map<string, SymbolEntry[]>,
): ExternalReferenceCard[] {
  const entries = symbols.get(token) ?? [];
  const byFile = new Map<string, { line: number; count: number }>();

  for (const entry of entries) {
    const key = normalizePath(entry.filePath);
    const prev = byFile.get(key);
    if (!prev) {
      byFile.set(key, { line: entry.line, count: 1 });
    } else {
      prev.count += 1;
      if (entry.line < prev.line) prev.line = entry.line;
    }
  }

  return [...byFile.entries()].map(([filePath, { line, count }]) => ({
    symbolName: token,
    filePath,
    line,
    occurrenceCount: count,
  }));
}

export function isEntryInGraph(
  token: string,
  entry: SymbolEntry,
  graphData: GraphData | null,
): boolean {
  if (!graphData) return false;
  if (entry.kind === "method" || entry.kind === "function") {
    return Boolean(findMethodGraphNode(token, entry, graphData));
  }
  return Boolean(findClassGraphNode(token, entry, graphData));
}

export function resolveVisibleTarget(
  token: string,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
): VisibleTargetResult {
  const entries = symbols.get(token) ?? [];
  if (entries.length === 0) return null;

  if (graphData) {
    for (const entry of entries) {
      const kind = symbolKindToSemantic(entry.kind);

      if (entry.kind === "method" || entry.kind === "function") {
        const methodNode = findMethodGraphNode(token, entry, graphData);
        if (!methodNode?.parent) continue;

        const classNode = graphData.nodes.find((n) => n.id === methodNode.parent);
        if (!classNode) continue;

        const flowNodeId = toFlowId(classNode.id);
        if (flowNodeId === sourceFlowId) continue;

        const classData = getClassNodeData(flowNodeId, getNode);
        if (!classData) continue;

        const memberId = findMemberId(methodNode, classData);
        if (!memberId) continue;

        const bodyExpanded = !(classData.collapsed ?? false);

        if (!bodyExpanded) {
          return {
            mode: "graph",
            level: "class",
            flowNodeId,
            targetHandle: previewTargetTop(flowNodeId),
            label: methodNode.label,
            kind,
            memberId,
          };
        }

        const methodExpanded = classData.expandedMethodIds.includes(memberId);
        if (!methodExpanded) {
          return {
            mode: "graph",
            level: "member",
            flowNodeId,
            targetHandle: previewMemberHandle(memberId),
            label: methodNode.label,
            kind,
            memberId,
          };
        }

        const methodItem = classData.methods.find((m) => m.id === memberId);
        const codeLines = methodItem?.code.split("\n") ?? [];
        let relativeLine = 1;
        for (let i = 0; i < codeLines.length; i++) {
          if (new RegExp(`\\b${escapeRegExp(token)}\\b`).test(codeLines[i]!)) {
            relativeLine = i + 1;
            break;
          }
        }
        return {
          mode: "graph",
          level: "line",
          flowNodeId,
          targetHandle: previewLineHandle(memberId, relativeLine),
          label: String(relativeLine),
          kind,
          memberId,
          lineNumber: relativeLine,
        };
      }

      const classNode = findClassGraphNode(token, entry, graphData);
      if (!classNode) continue;

      const flowNodeId = toFlowId(classNode.id);
      if (flowNodeId === sourceFlowId) continue;

      return {
        mode: "graph",
        level: "class",
        flowNodeId,
        targetHandle: previewTargetTop(flowNodeId),
        label: classNode.label,
        kind,
      };
    }
  }

  const anyInGraph = graphData
    ? entries.some((e) => isEntryInGraph(token, e, graphData))
    : false;
  if (anyInGraph) return null;

  const cards = buildExternalReferenceCards(token, symbols);
  if (cards.length === 0) return null;
  return { mode: "external", cards };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
