import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { allLocalDefElements } from "@/lib/localDefElements";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { graphPane } from "@/lib/graphPaneDom";

export type LinkPair = { from: HTMLElement; to: HTMLElement };

/**
 * Prototype `linksFor(host)` — def→usage pairs anchored on DOM elements.
 * Usage hosts carry `data-local-target-id`; definition hosts carry `data-local-def-id`.
 * Header chip + in-body param line share one `localDefId` — fan out from every def
 * sibling so both views wire to the same usages (same lexical binding).
 */
export function linksForElement(host: HTMLElement): LinkPair[] {
  const pane = graphPane();
  if (!pane) return [];

  const targetId = host.dataset.localTargetId;
  if (targetId) {
    const defs = allLocalDefElements(pane, targetId);
    if (defs.length === 0) return [];
    return defs.map((from) => ({ from, to: host }));
  }

  const defId = host.dataset.localDefId;
  if (!defId) return [];

  const defs = allLocalDefElements(pane, defId);
  const usages = pane.querySelectorAll<HTMLElement>(
    `[data-local-target-id="${CSS.escape(defId)}"]`,
  );
  const pairs: LinkPair[] = [];
  for (const from of defs) {
    for (const to of usages) {
      if (to === from) continue;
      pairs.push({ from, to });
    }
  }
  return pairs;
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
