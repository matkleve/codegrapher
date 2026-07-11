import {
  buildCallSiteLoadPreviewEdge,
  buildElementPreviewEdge,
  buildLoadPreviewEdge,
  buildUsagePreviewEdge,
} from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId } from "@/lib/ctrlPreviewHandles";
import {
  buildExternalReferenceCards,
  resolveVisibleTarget,
} from "@/lib/resolveVisibleTarget";
import type { SymbolEntry } from "@/types";
import { toFlowId } from "@/lib/graphIds";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import {
  bindingDefForInit,
  bindingInitFor,
  type MemberSymbolIndex,
} from "@/lib/localSymbolLinks";
import {
  controlFlowAnchorFor,
  controlFlowGroup,
  type ControlFlowIndex,
} from "@/lib/controlFlowLinks";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { AnchorRef, LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { ReferenceEntry } from "@/types";
import type { ConnectionCounts } from "@/lib/projectReferences";
import { allLocalDefElements, findLocalDefElement } from "@/lib/localDefElements";
import type { GraphData } from "@/types";
import type { Node } from "@xyflow/react";
import { makeControlFlowKey, makeUsageTokenKey } from "@/lib/traceKeys";

export type LinkPair = { from: HTMLElement; to: HTMLElement };

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

type UsageSite = {
  anchor: AnchorRef;
  liveTo: LiveAnchorHint;
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

/** Initializer expression → param/local binding on the declaring line. */
export function buildBindingPreviewEdges(
  host: HTMLElement,
  symbolIndex: MemberSymbolIndex,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  edgeIdPrefix: string,
): PreviewEdgeSpec[] {
  const pane = graphPane();
  if (!pane) return [];

  const defId = host.dataset.localDefId;
  let fromEl: HTMLElement | null;
  let toEl: HTMLElement | null;

  if (defId) {
    const site = bindingInitFor(symbolIndex, defId);
    if (!site) return [];
    toEl = host;
    const traceKey = makeUsageTokenKey(
      flowNodeId,
      memberId,
      site.lineNumber,
      site.token,
    );
    fromEl = pane.querySelector<HTMLElement>(
      `[data-trace-key="${CSS.escape(traceKey)}"]`,
    );
  } else {
    const targetDefId = bindingDefForInit(symbolIndex, lineNumber, tokenIndex);
    if (!targetDefId) return [];
    fromEl = host;
    toEl = findLocalDefElement(pane, targetDefId);
  }

  if (!fromEl || !toEl || fromEl === toEl) return [];

  return [
    {
      id: `${edgeIdPrefix}-binding`,
      from: { type: "element", el: fromEl },
      to: { type: "element", el: toEl },
      kind: "variable",
      connectionKind: "binding",
    },
  ];
}

/**
 * Control-flow fan-out: hovering the `switch`/`if` keyword or its
 * discriminant/condition identifier wires to every case/else branch; hovering
 * one branch (`case`/`else`) wires back to the head only. See
 * connection-taxonomy.md § Control flow.
 */
export function buildControlFlowPreviewEdges(
  host: HTMLElement,
  controlFlowIndex: ControlFlowIndex,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  edgeIdPrefix: string,
): PreviewEdgeSpec[] {
  const pane = graphPane();
  if (!pane) return [];

  const anchor = controlFlowAnchorFor(controlFlowIndex, lineNumber, tokenIndex);
  if (!anchor) return [];

  const group = controlFlowGroup(controlFlowIndex, anchor.groupId);
  if (!group) return [];

  const elAt = (line: number, idx: number): HTMLElement | null =>
    pane.querySelector<HTMLElement>(
      `[data-trace-key="${CSS.escape(makeControlFlowKey(flowNodeId, memberId, line, idx))}"]`,
    );

  if (anchor.role === "branch") {
    const headEl = elAt(group.headLine, group.headTokenIndex);
    if (!headEl || headEl === host) return [];
    return [
      {
        id: `${edgeIdPrefix}-branch`,
        from: { type: "element", el: headEl },
        to: { type: "element", el: host },
        kind: "variable",
        connectionKind: "branch",
      },
    ];
  }

  const edges: PreviewEdgeSpec[] = [];
  for (const branch of group.branches) {
    const branchEl = elAt(branch.lineNumber, branch.tokenIndex);
    if (!branchEl || branchEl === host) continue;
    edges.push({
      id: `${edgeIdPrefix}-branch-${branch.lineNumber}-${branch.tokenIndex}`,
      from: { type: "element", el: host },
      to: { type: "element", el: branchEl },
      kind: "variable",
      connectionKind: "branch",
    });
  }
  return edges;
}

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

export function paramUsageCount(
  symbolIndex: MemberSymbolIndex,
  paramDefId: string,
): number {
  let count = 0;
  for (const targetId of symbolIndex.usageTargets.values()) {
    if (targetId === paramDefId) count++;
  }
  return count;
}

/** Param definition in header or signature line → in-body usages (DOM or member-scoped index). */
/** Indexed type name in a method signature tag → definition on canvas or Load stub. */
export function buildSignatureTypeUsageEdges(
  symbolName: string,
  kind: SemanticTokenKind,
  usageEl: HTMLElement,
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
  sourceFlowId: string,
  memberId: string,
): PreviewEdgeSpec[] {
  const edgeKey = ctrlPreviewEdgeId(
    sourceFlowId,
    `sig-type::${memberId}::${symbolName}`,
  );

  let resolved = resolveVisibleTarget(
    symbolName,
    symbols,
    graphData,
    getNode,
    sourceFlowId,
  );
  if (!resolved) {
    const indexCards = buildExternalReferenceCards(symbolName, symbols);
    if (indexCards.length === 0) return [];
    resolved = { mode: "external", cards: indexCards };
  }

  if (resolved.mode === "external") {
    if (resolved.cards.length === 0) return [];
    return [
      buildLoadPreviewEdge(edgeKey, resolved.cards, usageEl, symbolName, kind),
    ];
  }

  return [buildUsagePreviewEdge(edgeKey, resolved, usageEl, symbolName)];
}

export function buildParamDefPreviewEdges(
  paramName: string,
  paramDefId: string,
  definitionEl: HTMLElement,
  symbolIndex: MemberSymbolIndex,
  flowNodeId: string,
  memberId: string,
  getNode: (id: string) => Node | undefined,
): PreviewEdgeSpec[] {
  const kind: SemanticTokenKind = "variable";
  const local = buildLocalPreviewEdges(definitionEl, kind, `param-def-${paramName}`);
  if (local.length > 0) return local;

  const classData = getClassNodeData(flowNodeId, getNode);
  if (!classData) return [];

  const edges: PreviewEdgeSpec[] = [];
  let idx = 0;
  for (const [key, targetId] of symbolIndex.usageTargets) {
    if (targetId !== paramDefId) continue;
    const lineNumber = Number(key.split(":")[0]);
    if (!Number.isFinite(lineNumber) || lineNumber < 1) continue;

    edges.push({
      id: `param-def-${paramName}-${idx}`,
      from: { type: "element", el: definitionEl },
      to: resolveUsageSiteAnchor(
        flowNodeId,
        classData,
        memberId,
        lineNumber,
        paramName,
      ),
      kind,
      liveTo: {
        token: paramName,
        flowNodeId,
        memberId,
        lineNumber,
        role: "usage",
      },
    });
    idx++;
  }
  return edges;
}

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

export function buildDefinitionPreviewEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
  context?: DefinitionEdgeContext,
): PreviewEdgeSpec[] {
  const local = buildLocalPreviewEdges(definitionEl, kind, `local-def-${token}`);
  if (local.length > 0) return local;

  const sites =
    context?.getNode
      ? resolveDefinitionUsageSites(
          token,
          definitionEl,
          context.graphData,
          context.getNode,
          context.sourceFlowId,
          context.sourceMemberId,
          context,
        )
      : resolveUsageAnchors(token, definitionEl).map((el) => ({
          anchor: { type: "element" as const, el },
          liveTo: { token, flowNodeId: context?.sourceFlowId ?? "", role: "usage" as const },
        }));

  if (sites.length === 0) {
    const offCanvas = context?.lookupOffCanvasCallSiteFiles?.(token) ?? [];
    if (offCanvas.length > 0) {
      const cards = offCanvas.map((site) => ({
        symbolName: token,
        filePath: site.filePath,
        line: site.line,
        occurrenceCount: 1,
      }));
      return [
        buildCallSiteLoadPreviewEdge(
          `callsite-load-${token}`,
          cards,
          definitionEl,
          token,
          kind,
        ),
      ];
    }
    return [];
  }

  const edges = sites.map((site, index) => ({
    id: `def-${token}-${index}`,
    from: { type: "element", el: definitionEl },
    to: site.anchor,
    kind,
    liveTo: site.liveTo,
  }));

  const offCanvas = context?.lookupOffCanvasCallSiteFiles?.(token) ?? [];
  if (offCanvas.length > 0) {
    const cards = offCanvas.map((site) => ({
      symbolName: token,
      filePath: site.filePath,
      line: site.line,
      occurrenceCount: 1,
    }));
    edges.push(
      buildCallSiteLoadPreviewEdge(
        `callsite-load-${token}`,
        cards,
        definitionEl,
        token,
        kind,
      ),
    );
  }

  return edges;
}

export function connectionCountForHost(
  host: HTMLElement,
  symbolName?: string,
  context?: DefinitionEdgeContext,
): number {
  return connectionCountsForHost(host, symbolName, context).onCanvas;
}

export function connectionCountsForHost(
  host: HTMLElement,
  symbolName?: string,
  context?: DefinitionEdgeContext,
): ConnectionCounts {
  const local = linksForElement(host);
  if (local.length > 0) {
    return { onCanvas: local.length, inProject: local.length };
  }
  if (!symbolName) return { onCanvas: 0, inProject: 0 };

  const onCanvas =
    context?.graphData && context.getNode
      ? resolveDefinitionUsageSites(
          symbolName,
          host,
          context.graphData,
          context.getNode,
          context.sourceFlowId,
          context.sourceMemberId,
          context,
        ).length
      : resolveUsageAnchors(symbolName, host).length;

  const inProject = context?.lookupProjectReferences?.(symbolName)?.length ?? onCanvas;
  return { onCanvas, inProject };
}
