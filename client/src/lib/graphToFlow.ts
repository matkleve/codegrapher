import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { flowEdgeId, toFlowId } from "@/lib/graphIds";
import {
  CLASS_NODE_DEFAULT_WIDTH,
  NODE_DRAG_HANDLE,
} from "@/components/nodes/graphNodeUi";
import type { ClassNodeData, FileNodeData } from "@/components/nodes/flowNodeData";
import {
  buildClassProperties,
  buildTypeAliasMembers,
  isTypeAliasCode,
  methodsForClassNode,
} from "@/lib/classBody";
import {
  computeClassNodeHeight,
  layoutPreferenceFromData,
} from "@/lib/classNodeLayout";
import { camelToWords } from "@/lib/camelToWords";
import { fileDisplayName } from "@/lib/recentFiles";
import { isStructuralEdgeType } from "@/lib/buildStructuralEdges";
import type { GraphData, GraphNode } from "@/types";

export type FlowNodeUiState = {
  expandedMethodIds: Set<string>;
  expandedPropertyIds: Set<string>;
  collapsedByGraphId: Map<string, boolean>;
  propertiesSectionCollapsedByGraphId: Map<string, boolean>;
  methodsSectionCollapsedByGraphId: Map<string, boolean>;
  widthByFlowId: Map<string, number>;
  heightByFlowId: Map<string, number>;
  pinnedMemberIdsByFlowId: Map<string, string[]>;
  layoutPreferenceByFlowId: Map<
    string,
    NonNullable<ClassNodeData["layoutPreference"]>
  >;
};

export function collectFlowNodeUiState(nodes: Node[]): FlowNodeUiState {
  const expandedMethodIds = new Set<string>();
  const expandedPropertyIds = new Set<string>();
  const collapsedByGraphId = new Map<string, boolean>();
  const propertiesSectionCollapsedByGraphId = new Map<string, boolean>();
  const methodsSectionCollapsedByGraphId = new Map<string, boolean>();
  const widthByFlowId = new Map<string, number>();
  const heightByFlowId = new Map<string, number>();
  const pinnedMemberIdsByFlowId = new Map<string, string[]>();
  const layoutPreferenceByFlowId = new Map<
    string,
    NonNullable<ClassNodeData["layoutPreference"]>
  >();
  for (const node of nodes) {
    if (node.type === "class") {
      const d = node.data as ClassNodeData;
      if (d.pinnedMemberIds?.length) {
        pinnedMemberIdsByFlowId.set(node.id, [...d.pinnedMemberIds]);
      }
      if (d.layoutPreference) {
        layoutPreferenceByFlowId.set(node.id, d.layoutPreference);
      }
      for (const id of d.expandedMethodIds) expandedMethodIds.add(id);
      for (const id of d.expandedPropertyIds) expandedPropertyIds.add(id);
      if (d.collapsed) collapsedByGraphId.set(d.graphNodeId, true);
      if (d.propertiesSectionCollapsed) {
        propertiesSectionCollapsedByGraphId.set(d.graphNodeId, true);
      }
      if (d.methodsSectionCollapsed) {
        methodsSectionCollapsedByGraphId.set(d.graphNodeId, true);
      }
      const w =
        d.width ??
        (typeof node.width === "number" ? node.width : undefined) ??
        (typeof node.style?.width === "number" ? node.style.width : undefined);
      if (typeof w === "number") widthByFlowId.set(node.id, w);
      const h =
        d.height ??
        (typeof node.height === "number" ? node.height : undefined);
      if (typeof h === "number") heightByFlowId.set(node.id, h);
    }
  }
  return {
    expandedMethodIds,
    expandedPropertyIds,
    collapsedByGraphId,
    propertiesSectionCollapsedByGraphId,
    methodsSectionCollapsedByGraphId,
    widthByFlowId,
    heightByFlowId,
    pinnedMemberIdsByFlowId,
    layoutPreferenceByFlowId,
  };
}

const CLASS_MIN_WIDTH = CLASS_NODE_DEFAULT_WIDTH;
const FILE_NODE_WIDTH = 160;
const FILE_NODE_HEIGHT = 56;

function hasValidLabel(label: string | undefined): boolean {
  return Boolean(label?.trim());
}

function estimateClassHeight(data: ClassNodeData): number {
  return computeClassNodeHeight(data);
}

export function estimateNodeSize(node: Node): { width: number; height: number } {
  if (node.type === "file") {
    return { width: FILE_NODE_WIDTH, height: FILE_NODE_HEIGHT };
  }
  const data = node.data as ClassNodeData;
  const width =
    typeof node.width === "number"
      ? node.width
      : typeof node.style?.width === "number"
        ? node.style.width
        : CLASS_MIN_WIDTH;
  return { width, height: estimateClassHeight(data) };
}

function resolveFlowEndpoint(
  graphId: string,
  byId: Map<string, GraphNode>,
  flowNodeGraphIds: Set<string>,
): string | null {
  const node = byId.get(graphId);
  if (!node) return null;

  if (node.type === "method" || node.type === "function") {
    if (node.parent && byId.has(node.parent)) {
      const parent = byId.get(node.parent)!;
      if (parent.type === "class" || parent.type === "module") {
        return flowNodeGraphIds.has(parent.id) ? toFlowId(parent.id) : null;
      }
    }
    if (node.type === "function" && flowNodeGraphIds.has(node.id)) {
      return toFlowId(node.id);
    }
    return null;
  }

  if (flowNodeGraphIds.has(node.id)) return toFlowId(node.id);
  return null;
}

export function graphToFlow(
  data: GraphData,
  ui: FlowNodeUiState,
): { nodes: Node[]; edges: Edge[] } {
  const {
    expandedMethodIds,
    expandedPropertyIds,
    collapsedByGraphId,
    propertiesSectionCollapsedByGraphId,
    methodsSectionCollapsedByGraphId,
    widthByFlowId,
    heightByFlowId,
    pinnedMemberIdsByFlowId,
    layoutPreferenceByFlowId,
  } = ui;
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const visible = data.nodes.filter((n) => hasValidLabel(n.label));

  const methodsByParent = new Map<string, GraphNode[]>();
  const topLevel: GraphNode[] = [];

  for (const node of visible) {
    if (node.type === "method") {
      if (node.parent && byId.has(node.parent)) {
        const list = methodsByParent.get(node.parent) ?? [];
        list.push(node);
        methodsByParent.set(node.parent, list);
      }
      continue;
    }
    if (node.type === "function" && node.parent) {
      const parent = byId.get(node.parent);
      if (parent && (parent.type === "class" || parent.type === "module")) {
        const list = methodsByParent.get(node.parent) ?? [];
        list.push(node);
        methodsByParent.set(node.parent, list);
        continue;
      }
    }
    topLevel.push(node);
  }

  const flowNodeGraphIds = new Set<string>();
  for (const node of topLevel) {
    if (node.type === "file" || node.type === "class" || node.type === "module") {
      flowNodeGraphIds.add(node.id);
    } else if (node.type === "function") {
      flowNodeGraphIds.add(node.id);
    }
  }

  const nodes: Node[] = topLevel
    .filter((n) => flowNodeGraphIds.has(n.id))
    .map((node) => {
      const id = toFlowId(node.id);
      if (node.type === "file") {
        const fileData: FileNodeData = {
          label: node.label,
          filePath: node.filePath,
          graphNodeId: node.id,
        };
        return {
          id,
          type: "file",
          position: { x: 0, y: 0 },
          draggable: true,
          dragHandle: `.${NODE_DRAG_HANDLE}`,
          data: fileData,
        };
      }

      const childMethods = methodsByParent.get(node.id) ?? [];
      const rawMethods =
        node.type === "function"
          ? [
              {
                id: node.id,
                label: node.label,
                code: node.code ?? "",
                startLine: node.startLine ?? 1,
              },
            ]
          : childMethods.map((m) => ({
              id: m.id,
              label: m.label,
              code: m.code ?? "",
              startLine: m.startLine ?? 1,
            }));

      const methods = methodsForClassNode(rawMethods).map((m) => ({
        ...m,
        symbolName: m.label,
        label: camelToWords(m.label),
      }));

      const isTypeAlias =
        node.type === "class" && isTypeAliasCode(node.code ?? "");

      const properties = isTypeAlias
        ? buildTypeAliasMembers(node.id, node.code ?? "", node.startLine ?? 1)
        : node.type === "class" || node.type === "module"
          ? buildClassProperties(node.id, node.code ?? "", rawMethods, node.startLine ?? 1).map(
              (p) => ({
                ...p,
                label: camelToWords(p.label),
              }),
            )
          : [];

      const classData: ClassNodeData = {
        label: node.label,
        fileName: fileDisplayName(node.filePath),
        filePath: node.filePath,
        graphNodeId: node.id,
        nodeKind: isTypeAlias
          ? "type"
          : node.type === "module"
            ? "module"
            : node.type === "function"
              ? "function"
              : "class",
        properties,
        methods: isTypeAlias ? [] : methods,
        expandedPropertyIds: properties
          .filter((p) => expandedPropertyIds.has(p.id))
          .map((p) => p.id),
        expandedMethodIds: methods
          .filter((m) => expandedMethodIds.has(m.id))
          .map((m) => m.id),
        propertiesSectionCollapsed:
          propertiesSectionCollapsedByGraphId.get(node.id) ?? false,
        methodsSectionCollapsed: methodsSectionCollapsedByGraphId.get(node.id) ?? false,
        collapsed: collapsedByGraphId.get(node.id) ?? false,
        width: widthByFlowId.get(id) ?? CLASS_NODE_DEFAULT_WIDTH,
        height: heightByFlowId.get(id),
        pinnedMemberIds: pinnedMemberIdsByFlowId.get(id) ?? [],
      };
      classData.layoutPreference =
        layoutPreferenceByFlowId.get(id) ?? layoutPreferenceFromData(classData);

      const nodeWidth = classData.width ?? CLASS_NODE_DEFAULT_WIDTH;
      const nodeHeight = classData.height ?? computeClassNodeHeight(classData);
      classData.height = nodeHeight;

      return {
        id,
        type: "class",
        position: { x: 0, y: 0 },
        width: nodeWidth,
        height: nodeHeight,
        style: { width: nodeWidth, height: nodeHeight },
        draggable: true,
        dragHandle: `.${NODE_DRAG_HANDLE}`,
        data: classData,
      };
    });

  const edges: Edge[] = [];
  for (const edge of data.edges) {
    const source = resolveFlowEndpoint(edge.source, byId, flowNodeGraphIds);
    const target = resolveFlowEndpoint(edge.target, byId, flowNodeGraphIds);
    if (!source || !target || source === target) continue;
    if (edge.type === "contains") continue;

    const isImport = edge.type === "imports";
    const isOverlayStructural = isStructuralEdgeType(edge.type);
    edges.push({
      id: flowEdgeId(edge),
      source,
      target,
      label: edge.label ?? undefined,
      hidden: isOverlayStructural,
      selectable: false,
      animated: isImport && !isOverlayStructural,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: isOverlayStructural
        ? { stroke: "var(--muted-foreground)", opacity: 0 }
        : isImport
          ? { stroke: "var(--primary)" }
          : { stroke: "var(--muted-foreground)" },
      labelStyle: {
        fontSize: 12,
        fill: "var(--foreground)",
      },
      labelBgStyle: {
        fill: "var(--card)",
        fillOpacity: 0.9,
      },
      data: { edgeType: edge.type, graphEdge: edge },
    });
  }

  return { nodes, edges };
}

/** Append only nodes/edges that do not already exist — preserves existing node dimensions. */
export function appendFlowElements(
  existingNodes: Node[],
  existingEdges: Edge[],
  incoming: { nodes: Node[]; edges: Edge[] },
): { nodes: Node[]; edges: Edge[] } {
  const existingNodeIds = new Set(existingNodes.map((n) => n.id));
  const freshNodes = incoming.nodes.filter((n) => !existingNodeIds.has(n.id));
  const existingEdgeIds = new Set(existingEdges.map((e) => e.id));
  const freshEdges = incoming.edges.filter((e) => !existingEdgeIds.has(e.id));
  return {
    nodes: [...existingNodes, ...freshNodes],
    edges: [...existingEdges, ...freshEdges],
  };
}

export { CLASS_MIN_WIDTH, FILE_NODE_HEIGHT, FILE_NODE_WIDTH };
