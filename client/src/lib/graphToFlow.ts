import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { flowEdgeId, toFlowId } from "@/lib/graphIds";
import {
  CLASS_NODE_DEFAULT_WIDTH,
  NODE_DRAG_HANDLE,
} from "@/components/nodes/graphNodeUi";
import type { ClassNodeData, FileNodeData } from "@/components/nodes/flowNodeData";
import { buildClassProperties, methodsForClassNode } from "@/lib/classBody";
import { camelToWords } from "@/lib/camelToWords";
import { fileDisplayName } from "@/lib/recentFiles";
import type { GraphData, GraphNode } from "@/types";

export type FlowNodeUiState = {
  expandedMethodIds: Set<string>;
  expandedPropertyIds: Set<string>;
  collapsedByGraphId: Map<string, boolean>;
};

export function collectFlowNodeUiState(nodes: Node[]): FlowNodeUiState {
  const expandedMethodIds = new Set<string>();
  const expandedPropertyIds = new Set<string>();
  const collapsedByGraphId = new Map<string, boolean>();
  for (const node of nodes) {
    if (node.type === "class") {
      const d = node.data as ClassNodeData;
      for (const id of d.expandedMethodIds) expandedMethodIds.add(id);
      for (const id of d.expandedPropertyIds) expandedPropertyIds.add(id);
      if (d.collapsed) collapsedByGraphId.set(d.graphNodeId, true);
    }
  }
  return { expandedMethodIds, expandedPropertyIds, collapsedByGraphId };
}

const CLASS_MIN_WIDTH = 280;
const FILE_NODE_WIDTH = 160;
const FILE_NODE_HEIGHT = 56;

function hasValidLabel(label: string | undefined): boolean {
  return Boolean(label?.trim());
}

function estimateClassHeight(data: ClassNodeData): number {
  const header = data.collapsed ? 72 : 88;
  if (data.collapsed) return Math.max(72, header);
  let body = 8;
  if (data.properties.length > 0) body += 24;
  for (const p of data.properties) {
    const expanded = data.expandedPropertyIds.includes(p.id);
    body += expanded ? 140 : 72;
  }
  if (data.properties.length > 0 && data.methods.length > 0) body += 8;
  if (data.methods.length > 0) body += 20;
  for (const m of data.methods) {
    const expanded = data.expandedMethodIds.includes(m.id);
    body += expanded ? 140 : 72;
  }
  return Math.max(120, header + body);
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
  const { expandedMethodIds, expandedPropertyIds, collapsedByGraphId } = ui;
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
              },
            ]
          : childMethods.map((m) => ({
              id: m.id,
              label: m.label,
              code: m.code ?? "",
            }));

      const methods = methodsForClassNode(rawMethods).map((m) => ({
        ...m,
        label: camelToWords(m.label),
      }));

      const properties =
        node.type === "class" || node.type === "module"
          ? buildClassProperties(node.id, node.code ?? "", rawMethods).map((p) => ({
              ...p,
              label: camelToWords(p.label),
            }))
          : [];

      const classData: ClassNodeData = {
        label: node.label,
        fileName: fileDisplayName(node.filePath),
        filePath: node.filePath,
        graphNodeId: node.id,
        nodeKind: node.type === "module" ? "module" : node.type === "function" ? "function" : "class",
        properties,
        methods,
        expandedPropertyIds: properties
          .filter((p) => expandedPropertyIds.has(p.id))
          .map((p) => p.id),
        expandedMethodIds: methods
          .filter((m) => expandedMethodIds.has(m.id))
          .map((m) => m.id),
        collapsed: collapsedByGraphId.get(node.id) ?? false,
      };

      return {
        id,
        type: "class",
        position: { x: 0, y: 0 },
        width: CLASS_NODE_DEFAULT_WIDTH,
        style: { width: CLASS_NODE_DEFAULT_WIDTH },
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
    edges.push({
      id: flowEdgeId(edge),
      source,
      target,
      label: edge.label ?? undefined,
      animated: isImport,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: isImport
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

export function mergeFlowElements(
  existingNodes: Node[],
  existingEdges: Edge[],
  incoming: { nodes: Node[]; edges: Edge[] },
): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map(existingNodes.map((n) => [n.id, n]));
  for (const n of incoming.nodes) {
    nodeMap.set(n.id, n);
  }
  const edgeMap = new Map(existingEdges.map((e) => [e.id, e]));
  for (const e of incoming.edges) {
    edgeMap.set(e.id, e);
  }
  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
  };
}

export { CLASS_MIN_WIDTH, FILE_NODE_HEIGHT, FILE_NODE_WIDTH };
