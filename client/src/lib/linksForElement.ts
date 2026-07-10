import { buildDefinitionFanOutEdges, buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export type LinkPair = { from: HTMLElement; to: HTMLElement };

function graphPane(): HTMLElement | null {
  return document.querySelector(".graph-pane");
}

/**
 * Prototype `linksFor(host)` — def→usage pairs anchored on DOM elements.
 * Usage hosts carry `data-local-target-id`; definition hosts carry `data-local-def-id`.
 */
export function linksForElement(host: HTMLElement): LinkPair[] {
  const pane = graphPane();
  if (!pane) return [];

  const targetId = host.dataset.localTargetId;
  if (targetId) {
    const def = pane.querySelector<HTMLElement>(
      `[data-local-def-id="${CSS.escape(targetId)}"]`,
    );
    return def ? [{ from: def, to: host }] : [];
  }

  const defId = host.dataset.localDefId;
  if (!defId) return [];

  const usages = pane.querySelectorAll<HTMLElement>(
    `[data-local-target-id="${CSS.escape(defId)}"]`,
  );
  return [...usages].map((to) => ({ from: host, to }));
}

export function resolvePropertyDefId(
  flowNodeId: string,
  propertyName: string,
): string | null {
  const pane = graphPane();
  if (!pane) return null;
  const el = pane.querySelector<HTMLElement>(
    `[data-flow-node-id="${CSS.escape(flowNodeId)}"] [data-symbol-role="definition"][data-symbol-name="${CSS.escape(propertyName)}"]`,
  );
  return el?.dataset.localDefId ?? null;
}

export function resolveLocalTargetId(
  rawTarget: string,
  flowNodeId: string,
): string | null {
  if (rawTarget.startsWith("property::")) {
    return resolvePropertyDefId(flowNodeId, rawTarget.slice("property::".length));
  }
  return rawTarget;
}

export function buildLocalPreviewEdges(
  host: HTMLElement,
  kind: SemanticTokenKind,
  edgeIdPrefix: string,
): PreviewEdgeSpec[] {
  return linksForElement(host).map((pair, index) =>
    buildElementPreviewEdge(`${edgeIdPrefix}-${index}`, pair.from, pair.to, kind),
  );
}

export function buildDefinitionPreviewEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
): PreviewEdgeSpec[] {
  const local = buildLocalPreviewEdges(definitionEl, kind, `local-def-${token}`);
  if (local.length > 0) return local;

  const globalUsages = resolveUsageAnchors(token, definitionEl);
  return buildDefinitionFanOutEdges(token, kind, definitionEl, globalUsages);
}

export function connectionCountForHost(
  host: HTMLElement,
  symbolName?: string,
): number {
  const local = linksForElement(host);
  if (local.length > 0) return local.length;
  if (symbolName) return resolveUsageAnchors(symbolName, host).length;
  return 0;
}
