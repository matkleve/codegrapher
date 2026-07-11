import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { toFlowId } from "@/lib/graphIds";
import { escapeRegExp } from "@/lib/graphPaneDom";
import type { AnchorRef, LiveAnchorHint } from "@/lib/previewEdgeTypes";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { GraphData, ReferenceEntry } from "@/types";
import type { Node } from "@xyflow/react";

export type DefinitionEdgeContext = {
  graphData: GraphData | null;
  getNode: (id: string) => Node | undefined;
  sourceFlowId: string;
  sourceMemberId?: string;
  /** Precomputed usage sites — avoids full graph scan on definition hover. */
  lookupIndexedUsageSites?: (
    token: string,
    sourceFlowId: string,
    sourceMemberId?: string,
  ) => UsageSiteRecord[];
  /** Project-wide call sites from the server reference index. */
  lookupProjectReferences?: (token: string) => ReferenceEntry[];
  lookupOffCanvasCallSiteFiles?: (token: string) => ReferenceEntry[];
};

export type UsageSite = {
  anchor: AnchorRef;
  liveTo: LiveAnchorHint;
};

/** Member-body line where `token` is the declared name (not a call/reference). */
export function isDefinitionSignatureLine(
  line: string,
  token: string,
  flowNodeId: string,
  memberId: string,
  sourceFlowId: string,
  sourceMemberId?: string,
): boolean {
  if (flowNodeId !== sourceFlowId || memberId !== sourceMemberId) return false;
  if (!new RegExp(`\\b${escapeRegExp(token)}\\b`).test(line)) return false;
  if (/\bfunction\b/.test(line) || /\bconst\b/.test(line)) return true;
  return new RegExp(`\\b${escapeRegExp(token)}\\s*[:=]`).test(line);
}

function usageSiteKey(site: UsageSite): string {
  return `${site.liveTo.flowNodeId}::${site.liveTo.memberId}::${site.liveTo.lineNumber}`;
}

/** Def → usage anchors: visible chips first, then graph handles for collapsed sites. */
export function resolveDefinitionUsageSites(
  token: string,
  definitionEl: HTMLElement,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  sourceMemberId?: string,
  context?: DefinitionEdgeContext,
): UsageSite[] {
  const targets: UsageSite[] = [];
  const seen = new Set<string>();

  const add = (site: UsageSite) => {
    const key =
      site.anchor.type === "element"
        ? (site.anchor.el.dataset.traceKey ?? site.anchor.el.textContent ?? "")
        : site.anchor.handle;
    const dedupe = key || usageSiteKey(site);
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    targets.push(site);
  };

  const indexed =
    context?.lookupIndexedUsageSites?.(token, sourceFlowId, sourceMemberId) ??
    [];

  if (indexed.length > 0) {
    for (const rec of indexed) {
      const rfNode = getNode(rec.flowNodeId);
      if (!rfNode || rfNode.type !== "class") continue;
      const classData = rfNode.data as ClassNodeData;

      add({
        anchor: resolveUsageSiteAnchor(
          rec.flowNodeId,
          classData,
          rec.memberId,
          rec.lineNumber,
          token,
        ),
        liveTo: {
          token,
          flowNodeId: rec.flowNodeId,
          memberId: rec.memberId,
          lineNumber: rec.lineNumber,
          role: "usage",
        },
      });
    }
    return targets;
  }

  for (const el of resolveUsageAnchors(token, definitionEl)) {
    const traceKey = el.dataset.traceKey ?? "";
    const parts = traceKey.split("::");
    if (parts.length >= 4) {
      add({
        anchor: { type: "element", el },
        liveTo: {
          token,
          flowNodeId: parts[0]!,
          memberId: parts[1],
          lineNumber: Number(parts[2]),
          role: "usage",
        },
      });
      continue;
    }
    add({
      anchor: { type: "element", el },
      liveTo: { token, flowNodeId: sourceFlowId, role: "usage" },
    });
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

        add({
          anchor: resolveUsageSiteAnchor(
            flowNodeId,
            classData,
            method.id,
            lineNumber,
            token,
          ),
          liveTo: {
            token,
            flowNodeId,
            memberId: method.id,
            lineNumber,
            role: "usage",
          },
        });
      }
    }
  }

  return targets;
}

export function resolveDefinitionUsageAnchors(
  token: string,
  definitionEl: HTMLElement,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  sourceMemberId?: string,
): AnchorRef[] {
  return resolveDefinitionUsageSites(
    token,
    definitionEl,
    graphData,
    getNode,
    sourceFlowId,
    sourceMemberId,
  ).map((site) => site.anchor);
}
