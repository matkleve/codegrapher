import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { toFlowId } from "@/lib/graphIds";
import {
  previewLineHandle,
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import type { AnchorRef, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { GraphData } from "@/types";
import type { Node } from "@xyflow/react";

export type LinkPair = { from: HTMLElement; to: HTMLElement };

export type DefinitionEdgeContext = {
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  sourceFlowId: string;
  sourceMemberId?: string;
};

function graphPane(): HTMLElement | null {
  return document.querySelector(".graph-pane");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function usageChipInGraph(
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  token: string,
): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;
  const traceKey = makeUsageTokenKey(flowNodeId, memberId, lineNumber, token);
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}

function isDefinitionSignatureLine(
  line: string,
  token: string,
  flowNodeId: string,
  memberId: string,
  sourceFlowId: string,
  sourceMemberId?: string,
): boolean {
  if (flowNodeId !== sourceFlowId || memberId !== sourceMemberId) return false;
  if (!/\bfunction\b/.test(line) && !/\bconst\b/.test(line)) return false;
  return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(line);
}

function anchorForUsageSite(
  flowNodeId: string,
  classData: ClassNodeData,
  memberId: string,
  lineNumber: number,
  token: string,
): AnchorRef {
  const chip = usageChipInGraph(flowNodeId, memberId, lineNumber, token);
  if (chip) return { type: "element", el: chip };

  const bodyExpanded = !(classData.collapsed ?? false);
  if (!bodyExpanded) {
    return { type: "handle", handle: previewTargetTop(flowNodeId) };
  }

  const methodExpanded = classData.expandedMethodIds.includes(memberId);
  if (!methodExpanded) {
    return { type: "handle", handle: previewMemberHandle(memberId) };
  }

  return { type: "handle", handle: previewLineHandle(memberId, lineNumber) };
}

/** Def → usage anchors: visible chips first, then graph handles for collapsed sites. */
export function resolveDefinitionUsageAnchors(
  token: string,
  definitionEl: HTMLElement,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  sourceMemberId?: string,
): AnchorRef[] {
  const targets: AnchorRef[] = [];
  const seen = new Set<string>();

  const add = (ref: AnchorRef) => {
    const key =
      ref.type === "element"
        ? (ref.el.dataset.traceKey ?? ref.el.textContent ?? "")
        : ref.handle;
    if (!key || seen.has(key)) return;
    seen.add(key);
    targets.push(ref);
  };

  for (const el of resolveUsageAnchors(token, definitionEl)) {
    add({ type: "element", el });
  }

  if (!graphData) return targets;

  const tokenRe = new RegExp(`\\b${escapeRegExp(token)}\\b`);

  for (const graphNode of graphData.nodes) {
    if (
      graphNode.type !== "class" &&
      graphNode.type !== "module" &&
      graphNode.type !== "function"
    ) {
      continue;
    }

    const flowNodeId = toFlowId(graphNode.id);
    const rfNode = getNode(flowNodeId);
    if (!rfNode || rfNode.type !== "class") continue;
    const classData = rfNode.data as ClassNodeData;

    for (const method of classData.methods) {
      const lines = method.code.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i] ?? "";
        if (!tokenRe.test(line)) continue;
        if (
          isDefinitionSignatureLine(
            line,
            token,
            flowNodeId,
            method.id,
            sourceFlowId,
            sourceMemberId,
          )
        ) {
          continue;
        }

        add(
          anchorForUsageSite(
            flowNodeId,
            classData,
            method.id,
            lineNumber,
            token,
          ),
        );
      }
    }
  }

  return targets;
}

export function buildDefinitionPreviewEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
  context?: DefinitionEdgeContext,
): PreviewEdgeSpec[] {
  const local = buildLocalPreviewEdges(definitionEl, kind, `local-def-${token}`);
  if (local.length > 0) return local;

  const anchors =
    context?.graphData && context.getNode
      ? resolveDefinitionUsageAnchors(
          token,
          definitionEl,
          context.graphData,
          context.getNode,
          context.sourceFlowId,
          context.sourceMemberId,
        )
      : resolveUsageAnchors(token, definitionEl).map((el) => ({
          type: "element" as const,
          el,
        }));

  if (anchors.length === 0) return [];

  return anchors.map((to, index) => ({
    id: `def-${token}-${index}`,
    from: { type: "element", el: definitionEl },
    to,
    kind,
  }));
}

export function connectionCountForHost(
  host: HTMLElement,
  symbolName?: string,
  context?: DefinitionEdgeContext,
): number {
  const local = linksForElement(host);
  if (local.length > 0) return local.length;
  if (!symbolName) return 0;
  if (context?.graphData && context.getNode) {
    return resolveDefinitionUsageAnchors(
      symbolName,
      host,
      context.graphData,
      context.getNode,
      context.sourceFlowId,
      context.sourceMemberId,
    ).length;
  }
  return resolveUsageAnchors(symbolName, host).length;
}
