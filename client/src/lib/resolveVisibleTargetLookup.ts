import { toFlowId } from "@/lib/graphIds";
import { normalizeFilePath } from "@/lib/graphFiles";
import { graphNodeForEntry } from "@/lib/semanticLookup";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { GraphData, GraphNode, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";
import { buildClassGraphTarget } from "@/lib/resolveClassTarget";
import { buildMemberGraphTarget } from "@/lib/resolveMemberTarget";
import type {
  ExternalReferenceCard,
  GraphVisibleTarget,
} from "@/lib/resolveVisibleTargetTypes";

function normalizePath(p: string): string {
  return normalizeFilePath(p);
}

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

function findMemberId(
  methodNode: GraphNode,
  classData: ClassNodeData,
  token: string,
): string | undefined {
  const byId = classData.methods.find((m) => m.id === methodNode.id);
  if (byId) return byId.id;
  const byLabel = classData.methods.find((m) => m.label === methodNode.label);
  if (byLabel) return byLabel.id;
  return classData.methods.find((m) => m.symbolName === token)?.id;
}

function containerGraphNode(
  methodNode: GraphNode,
  graphData: GraphData,
): GraphNode | undefined {
  if (methodNode.parent != null) {
    return graphData.nodes.find((n) => n.id === methodNode.parent);
  }
  if (methodNode.type === "function") return methodNode;
  return undefined;
}

/** Scan nodes already on the canvas — does not rely on index file paths. */
export function findDefinitionInLoadedGraph(
  token: string,
  graphData: GraphData,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  kind: ReturnType<typeof symbolKindToSemantic>,
): GraphVisibleTarget | null {
  for (const node of graphData.nodes) {
    if (node.type !== "class" && node.type !== "module" && node.type !== "function") {
      continue;
    }

    const flowNodeId = toFlowId(node.id);
    const classData = getClassNodeData(flowNodeId, getNode);
    if (!classData) continue;

    if (
      (node.type === "class" || node.type === "module") &&
      node.label === token
    ) {
      return buildClassGraphTarget(token, kind, flowNodeId, node.label);
    }

    const method = classData.methods.find((m) => m.symbolName === token);
    if (method) {
      const methodNode = graphData.nodes.find((n) => n.id === method.id);
      return buildMemberGraphTarget(
        token,
        kind,
        flowNodeId,
        classData,
        method.id,
        methodNode?.label ?? token,
        sourceFlowId,
        classData.methods,
        classData.expandedMethodIds,
      );
    }

    const property = classData.properties.find((m) => m.symbolName === token);
    if (property) {
      return buildMemberGraphTarget(
        token,
        kind,
        flowNodeId,
        classData,
        property.id,
        property.label,
        sourceFlowId,
        classData.properties,
        classData.expandedPropertyIds,
      );
    }
  }

  return null;
}

export function targetFromGraphNode(
  token: string,
  entry: SymbolEntry,
  graphNode: GraphNode,
  graphData: GraphData,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
): GraphVisibleTarget | null {
  const kind = symbolKindToSemantic(entry.kind);

  if (graphNode.type === "method" || graphNode.type === "function") {
    const container = containerGraphNode(graphNode, graphData);
    if (!container) return null;

    const flowNodeId = toFlowId(container.id);
    const classData = getClassNodeData(flowNodeId, getNode);
    if (!classData) return null;

    const memberId = findMemberId(graphNode, classData, token);
    if (!memberId) return null;

    return buildMemberGraphTarget(
      token,
      kind,
      flowNodeId,
      classData,
      memberId,
      graphNode.label,
      sourceFlowId,
      classData.methods,
      classData.expandedMethodIds,
    );
  }

  if (graphNode.type === "class" || graphNode.type === "module") {
    const flowNodeId = toFlowId(graphNode.id);

    if (entry.kind === "property") {
      const classData = getClassNodeData(flowNodeId, getNode);
      const property = classData?.properties.find((p) => p.symbolName === token);
      if (!classData || !property) return null;

      return buildMemberGraphTarget(
        token,
        kind,
        flowNodeId,
        classData,
        property.id,
        property.label,
        sourceFlowId,
        classData.properties,
        classData.expandedPropertyIds,
      );
    }

    return buildClassGraphTarget(token, kind, flowNodeId, graphNode.label);
  }

  return null;
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
  return Boolean(graphNodeForEntry(entry, token, graphData));
}

export function externalCardsNotYetInGraph(
  token: string,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
): ExternalReferenceCard[] {
  const cards = buildExternalReferenceCards(token, symbols);
  if (!graphData) return cards;

  return cards.filter((card) => {
    const entries = (symbols.get(token) ?? []).filter(
      (e) => normalizePath(e.filePath) === normalizePath(card.filePath),
    );
    if (entries.length === 0) return true;
    return !entries.some((e) => isEntryInGraph(token, e, graphData));
  });
}
