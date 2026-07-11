import { toFlowId } from "@/lib/graphIds";
import {
  previewLineHandle,
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import { fileLineFromSnippetIndex } from "@/lib/memberFileLine";
import { normalizeFilePath } from "@/lib/graphFiles";
import { graphNodeForEntry } from "@/lib/semanticLookup";
import { symbolKindToSemantic, type SemanticTokenKind } from "@/lib/tokenColors";
import { findClassDefLabel, findMemberDefLabel } from "@/lib/resolveLiveAnchor";
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
  definitionEl?: HTMLElement;
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

function buildClassGraphTarget(
  token: string,
  kind: SemanticTokenKind,
  flowNodeId: string,
  classLabel: string,
): GraphVisibleTarget {
  const definitionEl = findClassDefLabel(flowNodeId, token);
  return {
    mode: "graph",
    level: "class",
    flowNodeId,
    targetHandle: previewTargetTop(flowNodeId),
    definitionEl: definitionEl ?? undefined,
    label: classLabel,
    kind,
  };
}

/** Shared by methods and properties — both render as member rows with the same collapse/expand levels. */
function buildMemberGraphTarget(
  token: string,
  kind: SemanticTokenKind,
  flowNodeId: string,
  classData: ClassNodeData,
  memberId: string,
  memberLabel: string,
  sourceFlowId: string,
  members: ClassNodeData["methods"],
  expandedMemberIds: string[],
): GraphVisibleTarget {
  const definitionEl = findMemberDefLabel(flowNodeId, memberId, token);

  if (flowNodeId === sourceFlowId) {
    return {
      mode: "graph",
      level: "member",
      flowNodeId,
      targetHandle: previewMemberHandle(memberId),
      definitionEl: definitionEl ?? undefined,
      label: memberLabel,
      kind,
      memberId,
    };
  }

  const bodyExpanded = !(classData.collapsed ?? false);
  if (!bodyExpanded) {
    return {
      mode: "graph",
      level: "class",
      flowNodeId,
      targetHandle: previewTargetTop(flowNodeId),
      label: memberLabel,
      kind,
      memberId,
    };
  }

  const memberExpanded = expandedMemberIds.includes(memberId);
  if (!memberExpanded) {
    return {
      mode: "graph",
      level: "member",
      flowNodeId,
      targetHandle: previewMemberHandle(memberId),
      label: memberLabel,
      kind,
      memberId,
    };
  }

  const memberItem = members.find((m) => m.id === memberId);
  const codeLines = memberItem?.code.split("\n") ?? [];
  const startLine = memberItem?.startLine ?? 1;
  let fileLine = startLine;
  for (let i = 0; i < codeLines.length; i++) {
    if (new RegExp(`\\b${escapeRegExp(token)}\\b`).test(codeLines[i]!)) {
      fileLine = fileLineFromSnippetIndex(startLine, i);
      break;
    }
  }

  return {
    mode: "graph",
    level: "line",
    flowNodeId,
    targetHandle: previewLineHandle(memberId, fileLine),
    label: String(fileLine),
    kind,
    memberId,
    lineNumber: fileLine,
  };
}

/** Scan nodes already on the canvas — does not rely on index file paths. */
export function findDefinitionInLoadedGraph(
  token: string,
  graphData: GraphData,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  kind: SemanticTokenKind,
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

function targetFromGraphNode(
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

  if (
    graphNode.type === "class" ||
    graphNode.type === "module"
  ) {
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

export function resolveVisibleTarget(
  token: string,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
): VisibleTargetResult {
  const entries = symbols.get(token) ?? [];
  if (entries.length === 0) return null;

  const defaultKind = symbolKindToSemantic(entries[0]!.kind);

  if (graphData) {
    // Scoped index entries first — `enclosingSymbol` lets this pick the right
    // definition when multiple on-canvas classes share a member name. The bare
    // canvas scan below is a fallback for tokens with no (or no matching) entry.
    for (const entry of entries) {
      const graphNode = graphNodeForEntry(entry, token, graphData);
      if (!graphNode) continue;

      const target = targetFromGraphNode(
        token,
        entry,
        graphNode,
        graphData,
        getNode,
        sourceFlowId,
      );
      if (target) return target;
    }

    const onCanvas = findDefinitionInLoadedGraph(
      token,
      graphData,
      getNode,
      sourceFlowId,
      defaultKind,
    );
    if (onCanvas) return onCanvas;
  }

  const cards = externalCardsNotYetInGraph(token, symbols, graphData);
  if (cards.length > 0) {
    return { mode: "external", cards };
  }

  // Module-level types/interfaces indexed in a file on canvas but not graph nodes
  // (e.g. enum beside an exported class) still resolve to Load/jump via index cards.
  const moduleLevel = entries.filter(
    (e) =>
      !e.enclosingSymbol &&
      (e.kind === "type" || e.kind === "interface"),
  );
  if (moduleLevel.length > 0) {
    const onCanvas = graphData
      ? findDefinitionInLoadedGraph(
          token,
          graphData,
          getNode,
          sourceFlowId,
          defaultKind,
        )
      : null;
    if (!onCanvas) {
      const indexCards = buildExternalReferenceCards(token, symbols);
      if (indexCards.length > 0) {
        return { mode: "external", cards: indexCards };
      }
    }
  }

  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
