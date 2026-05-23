import type { ElementDefinition } from "cytoscape";
import type { GraphData, GraphEdge } from "@/types";

const CODE_PREVIEW_LINES_COLLAPSED = 3;

function truncateCode(code: string, maxLines: number): string {
  return code
    .split("\n")
    .slice(0, maxLines)
    .join("\n");
}

function edgeElementId(edge: GraphEdge): string {
  return `edge:${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`;
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
  const nodeIds = new Set(visibleNodes.map((n) => n.id));

  const parents = visibleNodes.filter((n) => !n.parent || !nodeIds.has(n.parent));
  const children = visibleNodes.filter(
    (n) => n.parent && nodeIds.has(n.parent) && hasValidLabel(n.label),
  );
  const ordered = [...parents, ...children];

  const nodeElements: ElementDefinition[] = ordered.map((node) => {
    const isMethodLike = node.type === "method" || node.type === "function";
    const expanded = isMethodLike && expandedMethods.has(node.id);
    const codePreview = truncateCode(
      node.code ?? "",
      expanded ? 200 : CODE_PREVIEW_LINES_COLLAPSED,
    );
    const displayLabel =
      isMethodLike && codePreview
        ? `${node.label}\n${codePreview}`
        : node.label;

    return {
      data: {
        id: node.id,
        label: node.label,
        displayLabel,
        type: node.type,
        filePath: node.filePath,
        code: node.code,
        parent: node.parent && nodeIds.has(node.parent) ? node.parent : undefined,
        expanded: expanded ? "true" : "false",
      },
    };
  });

  const edgeElements: ElementDefinition[] = data.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((edge) => ({
      data: {
        id: edgeElementId(edge),
        source: edge.source,
        target: edge.target,
        type: edge.type,
        edgeLabel: edge.label ?? "",
      },
    }));

  return [...nodeElements, ...edgeElements];
}
