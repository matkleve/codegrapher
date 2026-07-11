import { previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { flowEdgeId, toFlowId } from "@/lib/graphIds";
import {
  STRUCTURAL_EDGE_STYLE,
  type StructuralEdgeSpec,
} from "@/lib/structuralEdgeTypes";
import type { GraphData, StructuralEdgeType } from "@/types";

const STRUCTURAL_TYPES = new Set<StructuralEdgeType>([
  "extends",
  "implements",
  "composition",
  "imports",
]);

export function isStructuralEdgeType(type: string): type is StructuralEdgeType {
  return STRUCTURAL_TYPES.has(type as StructuralEdgeType);
}

export function buildStructuralEdges(
  graphData: GraphData | null,
  mountedGraphNodeIds: ReadonlySet<string>,
  visibleTypes: ReadonlySet<StructuralEdgeType>,
): StructuralEdgeSpec[] {
  if (!graphData) return [];

  const specs: StructuralEdgeSpec[] = [];

  for (const edge of graphData.edges) {
    if (!isStructuralEdgeType(edge.type)) continue;
    if (!visibleTypes.has(edge.type)) continue;
    if (!mountedGraphNodeIds.has(edge.source) || !mountedGraphNodeIds.has(edge.target)) {
      continue;
    }

    const sourceFlowId = toFlowId(edge.source);
    const targetFlowId = toFlowId(edge.target);
    const style = STRUCTURAL_EDGE_STYLE[edge.type];

    specs.push({
      id: flowEdgeId(edge),
      from: { type: "handle", handle: previewTargetTop(sourceFlowId) },
      to: { type: "handle", handle: previewTargetTop(targetFlowId) },
      edgeType: edge.type,
      strokeStyle: style.strokeStyle,
      arrowhead: style.arrowhead,
      label: edge.label,
    });
  }

  return specs;
}

export function mountedClassGraphIds(
  graphData: GraphData | null,
  flowNodeIds: ReadonlySet<string>,
): Set<string> {
  const mounted = new Set<string>();
  if (!graphData) return mounted;

  for (const node of graphData.nodes) {
    if (node.type !== "class" && node.type !== "module") continue;
    if (flowNodeIds.has(toFlowId(node.id))) {
      mounted.add(node.id);
    }
  }
  return mounted;
}
