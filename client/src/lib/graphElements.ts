import type { ElementDefinition } from "cytoscape";
import { toCyEdgeId, toCyElementId } from "@/lib/cytoscapeIds";
import type { GraphData, GraphEdge } from "@/types";

const CODE_PREVIEW_LINES_COLLAPSED = 3;

function truncateCode(code: string, maxLines: number): string {
  return code
    .split("\n")
    .slice(0, maxLines)
    .join("\n");
}

function edgeElementId(edge: GraphEdge): string {
  return toCyEdgeId(
    `edge:${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`,
  );
}

function hasValidLabel(label: string | undefined): boolean {
  return Boolean(label?.trim());
}

export function graphToElements(
  data: GraphData,
  expandedMethods: Set<string>,
): ElementDefinition[] {
  const visibleNodes = data.nodes.filter(
    (n) => n.type !== "file" && hasValidLabel(n.label),
  );
  const graphIdToCyId = new Map(visibleNodes.map((n) => [n.id, toCyElementId(n.id)]));
  const nodeIds = new Set(visibleNodes.map((n) => n.id));

  const parents = visibleNodes.filter((n) => !n.parent || !nodeIds.has(n.parent));
  const children = visibleNodes.filter(
    (n) => n.parent && nodeIds.has(n.parent) && hasValidLabel(n.label),
  );
  const ordered = [...parents, ...children];

  const nodeElements: ElementDefinition[] = ordered.map((node) => {
    const cyId = graphIdToCyId.get(node.id)!;
    const isMethodLike = node.type === "method" || node.type === "function";
    const expanded = isMethodLike && expandedMethods.has(cyId);
    const codePreview = truncateCode(
      node.code ?? "",
      expanded ? 200 : CODE_PREVIEW_LINES_COLLAPSED,
    );
    const displayLabel =
      isMethodLike && codePreview
        ? `${node.label}\n${codePreview}`
        : node.label;

    const parentCyId =
      node.parent && nodeIds.has(node.parent)
        ? graphIdToCyId.get(node.parent)
        : undefined;

    return {
      data: {
        id: cyId,
        graphNodeId: node.id,
        label: node.label,
        displayLabel,
        type: node.type,
        filePath: node.filePath,
        code: node.code,
        parent: parentCyId,
        expanded: expanded ? "true" : "false",
      },
    };
  });

  const edgeElements: ElementDefinition[] = data.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((edge) => ({
      data: {
        id: edgeElementId(edge),
        source: graphIdToCyId.get(edge.source)!,
        target: graphIdToCyId.get(edge.target)!,
        type: edge.type,
        edgeLabel: edge.label ?? "",
      },
    }));

  return [...nodeElements, ...edgeElements];
}
