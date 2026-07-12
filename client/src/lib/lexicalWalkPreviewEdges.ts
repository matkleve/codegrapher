import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { findLocalDefElement } from "@/lib/localDefElements";
import { getByTraceKey } from "@/lib/elementRegistry";
import { filterRenderablePreviewEdges } from "@/lib/previewEdgeFilter";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { graphPane } from "@/lib/graphPaneDom";
import {
  tokenAtSite,
  type LexicalGraph,
  type LexicalHopEndpoint,
  type LexicalSite,
  type LexicalWalkHop,
} from "@/lib/lexicalGraph";
import { previewHopFromDepth } from "@/lib/traceDepth";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import type { Node } from "@xyflow/react";

export type LexicalPreviewContext = {
  originEl: HTMLElement;
  originDefId?: string;
  originToken?: string;
  flowNodeId: string;
  memberId: string;
  classData: ClassNodeData;
  graph: LexicalGraph;
  kind: SemanticTokenKind;
  edgeIdPrefix: string;
  /** Added to each walk hop depth (e.g. type cascade already consumed depth 1–2). */
  depthOffset?: number;
  getNode: (id: string) => Node | undefined;
};

function resolveSiteChip(
  ctx: LexicalPreviewContext,
  site: LexicalSite,
  token: string,
): HTMLElement | null {
  const traceKey = makeUsageTokenKey(
    ctx.flowNodeId,
    ctx.memberId,
    site.lineNumber,
    site.tokenIndex,
    token,
  );
  const fromRegistry = getByTraceKey(traceKey);
  if (fromRegistry?.isConnected) return fromRegistry;

  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}

function resolveDefChip(defId: string): HTMLElement | null {
  const pane = graphPane();
  return pane ? findLocalDefElement(pane, defId) : null;
}

function endpointToken(
  ctx: LexicalPreviewContext,
  endpoint: LexicalHopEndpoint,
): string {
  if (endpoint.node === "def") {
    return endpoint.defId.split("::").at(-2) ?? "";
  }
  return tokenAtSite(ctx.graph, endpoint.site);
}

function resolveEndpointEl(
  ctx: LexicalPreviewContext,
  endpoint: LexicalHopEndpoint,
  preferOrigin?: HTMLElement,
): HTMLElement | null {
  if (endpoint.node === "def") {
    if (ctx.originDefId === endpoint.defId && preferOrigin?.isConnected) {
      return preferOrigin;
    }
    return resolveDefChip(endpoint.defId);
  }
  const token = tokenAtSite(ctx.graph, endpoint.site);
  return resolveSiteChip(ctx, endpoint.site, token);
}

function hopConnectionKind(hop: LexicalWalkHop): PreviewEdgeSpec["connectionKind"] {
  if (hop.kind === "binding-init") return "binding";
  return "usage";
}

function buildHopEdge(
  ctx: LexicalPreviewContext,
  hop: LexicalWalkHop,
): PreviewEdgeSpec | null {
  const fromToken = endpointToken(ctx, hop.from);
  const toToken = endpointToken(ctx, hop.to);
  const connectionKind = hopConnectionKind(hop);
  const edgeHop = previewHopFromDepth(hop.depth + (ctx.depthOffset ?? 0));

  const fromEl = resolveEndpointEl(ctx, hop.from, ctx.originEl);
  const toEl = resolveEndpointEl(ctx, hop.to);

  if (fromEl?.isConnected && toEl?.isConnected && fromEl !== toEl) {
    const edge = buildElementPreviewEdge(
      `${ctx.edgeIdPrefix}-chain-${hop.id}`,
      fromEl,
      toEl,
      ctx.kind,
    );
    return {
      ...edge,
      connectionKind,
      ...(edgeHop != null ? { hop: edgeHop } : {}),
      liveTo:
        hop.to.node === "site"
          ? {
              token: toToken,
              flowNodeId: ctx.flowNodeId,
              memberId: ctx.memberId,
              lineNumber: hop.to.site.lineNumber,
              tokenIndex: hop.to.site.tokenIndex,
              role: toEl.dataset.symbolRole === "definition" ? "definition" : "usage",
            }
          : {
              token: toToken,
              flowNodeId: ctx.flowNodeId,
              memberId: ctx.memberId,
              role: "definition",
            },
    };
  }

  const fromSite = hop.from.node === "site" ? hop.from.site : undefined;
  const toSite = hop.to.node === "site" ? hop.to.site : undefined;

  return {
    id: `${ctx.edgeIdPrefix}-chain-${hop.id}`,
    from:
      fromEl?.isConnected
        ? { type: "element", el: fromEl }
        : fromSite
          ? resolveUsageSiteAnchor(
              ctx.flowNodeId,
              ctx.classData,
              ctx.memberId,
              fromSite.lineNumber,
              fromSite.tokenIndex,
              fromToken,
            )
          : { type: "element", el: ctx.originEl },
    to:
      toSite
        ? resolveUsageSiteAnchor(
            ctx.flowNodeId,
            ctx.classData,
            ctx.memberId,
            toSite.lineNumber,
            toSite.tokenIndex,
            toToken,
          )
        : toEl
          ? { type: "element", el: toEl }
          : resolveUsageSiteAnchor(
              ctx.flowNodeId,
              ctx.classData,
              ctx.memberId,
              0,
              0,
              toToken,
            ),
    kind: ctx.kind,
    connectionKind,
    ...(edgeHop != null ? { hop: edgeHop } : {}),
    liveFrom: {
      token: fromToken,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: fromSite?.lineNumber,
      tokenIndex: fromSite?.tokenIndex,
      role: fromSite ? "usage" : "definition",
      traceKey: fromEl?.dataset.traceKey ?? ctx.originEl.dataset.traceKey,
    },
    liveTo: toSite
      ? {
          token: toToken,
          flowNodeId: ctx.flowNodeId,
          memberId: ctx.memberId,
          lineNumber: toSite.lineNumber,
          tokenIndex: toSite.tokenIndex,
          role: "usage",
        }
      : {
          token: toToken,
          flowNodeId: ctx.flowNodeId,
          memberId: ctx.memberId,
          role: "definition",
        },
  };
}

function buildBackwardHopEdge(
  ctx: LexicalPreviewContext,
  hop: LexicalWalkHop,
): PreviewEdgeSpec | null {
  const toToken = endpointToken(ctx, hop.to);
  const edgeHop = previewHopFromDepth(hop.depth + (ctx.depthOffset ?? 0));
  const toEl =
    hop.to.node === "site"
      ? resolveSiteChip(ctx, hop.to.site, toToken)
      : resolveDefChip(hop.to.defId);

  if (toEl?.isConnected) {
    const edge = buildElementPreviewEdge(
      `${ctx.edgeIdPrefix}-${hop.id}`,
      ctx.originEl,
      toEl,
      ctx.kind,
    );
    return edgeHop != null ? { ...edge, hop: edgeHop } : edge;
  }

  const toSite = hop.to.node === "site" ? hop.to.site : ctx.graph.defSiteOf.get(hop.to.defId);
  if (!toSite && hop.to.node === "def") {
    const defSite = ctx.graph.defSiteOf.get(hop.to.defId);
    if (!defSite) return null;
    return {
      id: `${ctx.edgeIdPrefix}-${hop.id}`,
      from: { type: "element", el: ctx.originEl },
      to: resolveUsageSiteAnchor(
        ctx.flowNodeId,
        ctx.classData,
        ctx.memberId,
        defSite.lineNumber,
        defSite.tokenIndex,
        toToken,
      ),
      kind: ctx.kind,
      ...(edgeHop != null ? { hop: edgeHop } : {}),
      liveFrom: {
        token: ctx.originToken ?? ctx.originDefId?.split("::").at(-2) ?? "",
        flowNodeId: ctx.flowNodeId,
        memberId: ctx.memberId,
        role: "usage",
        traceKey: ctx.originEl.dataset.traceKey,
      },
      liveTo: {
        token: toToken,
        flowNodeId: ctx.flowNodeId,
        memberId: ctx.memberId,
        lineNumber: defSite.lineNumber,
        tokenIndex: defSite.tokenIndex,
        role: "definition",
      },
    };
  }

  if (!toSite) return null;

  return {
    id: `${ctx.edgeIdPrefix}-${hop.id}`,
    from: { type: "element", el: ctx.originEl },
    to: resolveUsageSiteAnchor(
      ctx.flowNodeId,
      ctx.classData,
      ctx.memberId,
      toSite.lineNumber,
      toSite.tokenIndex,
      toToken,
    ),
    kind: ctx.kind,
    ...(edgeHop != null ? { hop: edgeHop } : {}),
    liveFrom: {
      token: ctx.originToken ?? "",
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      role: "usage",
      traceKey: ctx.originEl.dataset.traceKey,
    },
    liveTo: {
      token: toToken,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: toSite.lineNumber,
      tokenIndex: toSite.tokenIndex,
      role: hop.to.node === "def" ? "definition" : "usage",
    },
  };
}

export function lexicalWalkToPreviewEdges(
  hops: LexicalWalkHop[],
  ctx: LexicalPreviewContext,
  mode: "forward" | "backward" = "forward",
): PreviewEdgeSpec[] {
  const edges: PreviewEdgeSpec[] = [];
  for (const hop of hops) {
    const edge =
      mode === "backward"
        ? buildBackwardHopEdge(ctx, hop)
        : buildHopEdge(ctx, hop);
    if (edge) edges.push(edge);
  }
  return filterRenderablePreviewEdges(edges, ctx.getNode);
}
