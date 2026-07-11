import { buildElementPreviewEdge, liveToFromUsageEl } from "@/lib/buildPreviewEdges";
import { findLocalDefElement } from "@/lib/localDefElements";
import { areMemberDefSiblingHosts } from "@/lib/memberDefAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { graphPane } from "@/lib/graphPaneDom";

export type LinkPair = { from: HTMLElement; to: HTMLElement };

/** Declaration chip for a scoped local — from either a def or usage host. */
export function canonicalLocalDefHost(host: HTMLElement): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;

  const targetId = host.dataset.localTargetId;
  if (targetId) return findLocalDefElement(pane, targetId);

  if (host.dataset.localDefId) return host;
  return null;
}

/**
 * Prototype `linksFor(host)` — def→usage pairs anchored on DOM elements.
 * Usage hosts carry `data-local-target-id`; definition hosts carry `data-local-def-id`.
 * Header chip + in-body param share one `localDefId` — lit highlights every sibling,
 * but wires use a single anchor per pair (hovered def, or preferred in-body def).
 */
export function linksForElement(host: HTMLElement): LinkPair[] {
  const pane = graphPane();
  if (!pane) return [];

  const targetId = host.dataset.localTargetId;
  if (targetId) {
    const from = findLocalDefElement(pane, targetId);
    if (!from || from === host || areMemberDefSiblingHosts(from, host)) return [];
    return [{ from, to: host }];
  }

  const defId = host.dataset.localDefId;
  if (!defId) return [];

  const usages = pane.querySelectorAll<HTMLElement>(
    `[data-local-target-id="${CSS.escape(defId)}"]`,
  );
  const pairs: LinkPair[] = [];
  for (const to of usages) {
    if (to === host || areMemberDefSiblingHosts(host, to)) continue;
    pairs.push({ from: host, to });
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
  const defHost = canonicalLocalDefHost(host) ?? host;
  return linksForElement(defHost).map((pair, index) =>
    buildElementPreviewEdge(`${edgeIdPrefix}-${index}`, pair.from, pair.to, kind),
  );
}
