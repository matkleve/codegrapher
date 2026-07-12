import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { findLocalDefElement } from "@/lib/localDefElements";
import { getByTraceKey } from "@/lib/elementRegistry";
import {
  bindingDefForInit,
  bindingInitFor,
  type MemberSymbolIndex,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveUsageSiteAnchor } from "@/lib/resolveLiveAnchor";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { graphPane } from "@/lib/graphPaneDom";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { makeUsageTokenKey } from "@/lib/traceKeys";

/** Max BFS depth from a definition when fanning out lexical relatives. */
export const RELATIVE_MAX_DEPTH = 5;

/** Max backward hops from a usage / member-access hover. */
export const BACKWARD_LEXICAL_MAX_DEPTH = 5;

/** Max preview wires from one def-relative walk (nearest-first). */
export const RELATIVE_FAN_OUT_CAP = 24;

/**
 * Downstream lexical walk depth (def → usages → bindings → member props).
 * Alias for tuning — same as {@link RELATIVE_MAX_DEPTH}.
 */
export const TRACE_DEPTH_DOWN = RELATIVE_MAX_DEPTH;

/**
 * Upstream lexical walk depth (usage → binding → param).
 * Alias for tuning — same as {@link BACKWARD_LEXICAL_MAX_DEPTH}.
 */
export const TRACE_DEPTH_UP = BACKWARD_LEXICAL_MAX_DEPTH;

/** Visual opacity tiers cap at hop 3 (`preview-wire--hop2` / `--hop3`). */
export const TRACE_VISUAL_HOP_MAX = 3;

type Site = { lineNumber: number; tokenIndex: number };

type RelativeWalkContext = {
  originDefId: string;
  originEl: HTMLElement;
  /** Hovered token name when `originDefId` is empty (backward walk). */
  originToken?: string;
  symbolIndex: MemberSymbolIndex;
  methodCode: string;
  methodStartLine: number;
  flowNodeId: string;
  memberId: string;
  classData: ClassNodeData;
  kind: SemanticTokenKind;
  edgeIdPrefix: string;
  maxDepth?: number;
  maxEdges?: number;
  /** Extra hop tiers when the visual origin is upstream (e.g. sig-type vs param def). */
  hopOffset?: number;
  /** Emit tier-1 usage wires from the walk root (for sig-type origin). */
  includeDirectUsages?: boolean;
  /** Keep `originEl` instead of preferring the inline body duplicate of the same def. */
  preferOriginEl?: boolean;
};

function usageSitesForDef(index: MemberSymbolIndex, defId: string): Site[] {
  const sites: Site[] = [];
  for (const [key, targetId] of index.usageTargets) {
    if (targetId !== defId) continue;
    const [lineStr, idxStr] = key.split(":");
    const lineNumber = Number(lineStr);
    const tokenIndex = Number(idxStr);
    if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) continue;
    sites.push({ lineNumber, tokenIndex });
  }
  return sites;
}

function lineTokens(methodCode: string, methodStartLine: number, lineNumber: number) {
  const line = methodCode.split("\n")[lineNumber - methodStartLine] ?? "";
  return tokenizeLine(line).tokens;
}

function bindingDefsFromUsage(
  index: MemberSymbolIndex,
  methodCode: string,
  methodStartLine: number,
  usage: Site,
): string[] {
  const found = new Set<string>();
  const direct = bindingDefForInit(index, usage.lineNumber, usage.tokenIndex);
  if (direct) found.add(direct);

  const tokens = lineTokens(methodCode, methodStartLine, usage.lineNumber);
  for (const [defId, site] of index.bindingInitOf) {
    if (site.lineNumber !== usage.lineNumber) continue;
    if (site.tokenIndex === usage.tokenIndex) {
      found.add(defId);
      continue;
    }
    const receivers = memberAccessReceiverIndices(tokens, site.tokenIndex);
    if (receivers.includes(usage.tokenIndex)) found.add(defId);
  }
  return [...found];
}

function memberPropsFromReceiverUsage(
  index: MemberSymbolIndex,
  methodCode: string,
  methodStartLine: number,
  defId: string,
): Site[] {
  const out: Site[] = [];
  for (const usage of usageSitesForDef(index, defId)) {
    const tokens = lineTokens(methodCode, methodStartLine, usage.lineNumber);
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i]?.kind !== "identifier") continue;
      let dotIdx = i - 1;
      while (dotIdx >= 0 && tokens[dotIdx]?.kind === "whitespace") dotIdx--;
      if (dotIdx < 0 || tokens[dotIdx]?.text !== ".") continue;
      const receivers = memberAccessReceiverIndices(tokens, i);
      if (receivers.includes(usage.tokenIndex)) {
        out.push({ lineNumber: usage.lineNumber, tokenIndex: i });
      }
    }
  }
  return out;
}

function tokenNameAt(
  methodCode: string,
  methodStartLine: number,
  site: Site,
): string {
  const tokens = lineTokens(methodCode, methodStartLine, site.lineNumber);
  return tokens[site.tokenIndex]?.text ?? "";
}

function edgeHop(levelFromOrigin: number, hopOffset = 0): number | undefined {
  const hop = levelFromOrigin + hopOffset;
  if (hop <= 1) return undefined;
  return Math.min(hop, 3);
}

function resolveSiteChip(ctx: RelativeWalkContext, site: Site): HTMLElement | null {
  const token = tokenNameAt(ctx.methodCode, ctx.methodStartLine, site);
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

function resolveDefChip(ctx: RelativeWalkContext, defId: string): HTMLElement | null {
  const pane = graphPane();
  return pane ? findLocalDefElement(pane, defId) : null;
}

function buildChainedEdge(
  ctx: RelativeWalkContext,
  fromEl: HTMLElement,
  toEl: HTMLElement | null,
  level: number,
  suffix: string,
  toSite: Site,
  fromSite?: Site,
): PreviewEdgeSpec | null {
  const toToken = tokenNameAt(ctx.methodCode, ctx.methodStartLine, toSite);
  const fromToken = fromSite
    ? tokenNameAt(ctx.methodCode, ctx.methodStartLine, fromSite)
    : fromEl.dataset.symbolName ?? ctx.originDefId.split("::").at(-2) ?? "";
  const hop = edgeHop(level, ctx.hopOffset ?? 0);

  if (fromEl.isConnected && toEl?.isConnected && fromEl !== toEl) {
    const edge = buildElementPreviewEdge(
      `${ctx.edgeIdPrefix}-chain-${suffix}`,
      fromEl,
      toEl,
      ctx.kind,
    );
    return {
      ...edge,
      hop,
      liveTo: {
        token: toToken,
        flowNodeId: ctx.flowNodeId,
        memberId: ctx.memberId,
        lineNumber: toSite.lineNumber,
        tokenIndex: toSite.tokenIndex,
        role: toEl.dataset.symbolRole === "definition" ? "definition" : "usage",
      },
    };
  }

  return {
    id: `${ctx.edgeIdPrefix}-chain-${suffix}`,
    from: fromSite
      ? resolveUsageSiteAnchor(
          ctx.flowNodeId,
          ctx.classData,
          ctx.memberId,
          fromSite.lineNumber,
          fromSite.tokenIndex,
          fromToken,
        )
      : { type: "element", el: fromEl },
    to: resolveUsageSiteAnchor(
      ctx.flowNodeId,
      ctx.classData,
      ctx.memberId,
      toSite.lineNumber,
      toSite.tokenIndex,
      toToken,
    ),
    kind: ctx.kind,
    hop,
    liveFrom: {
      token: fromToken,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: fromSite?.lineNumber,
      tokenIndex: fromSite?.tokenIndex,
      role: fromSite ? "usage" : "definition",
      traceKey: fromEl.dataset.traceKey,
    },
    liveTo: {
      token: toToken,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: toSite.lineNumber,
      tokenIndex: toSite.tokenIndex,
      role: "usage",
    },
  };
}

function buildChainedDefEdge(
  ctx: RelativeWalkContext,
  fromEl: HTMLElement,
  fromSite: Site,
  defId: string,
  level: number,
  suffix: string,
): PreviewEdgeSpec | null {
  const toEl = resolveDefChip(ctx, defId);
  const site = defSiteKey(ctx.symbolIndex, defId);
  if (!site) return null;
  return buildChainedEdge(ctx, fromEl, toEl, level, suffix, site, fromSite);
}

/** Fan-out edge from a fixed origin (backward walk only). */
function buildSiteEdge(
  ctx: RelativeWalkContext,
  site: Site,
  levelFromOrigin: number,
  suffix: string,
): PreviewEdgeSpec | null {
  const toEl = resolveSiteChip(ctx, site);
  if (!toEl?.isConnected) {
    const token = tokenNameAt(ctx.methodCode, ctx.methodStartLine, site);
    return {
      id: `${ctx.edgeIdPrefix}-rel-${suffix}`,
      from: { type: "element", el: ctx.originEl },
      to: resolveUsageSiteAnchor(
        ctx.flowNodeId,
        ctx.classData,
        ctx.memberId,
        site.lineNumber,
        site.tokenIndex,
        token,
      ),
      kind: ctx.kind,
      hop: edgeHop(levelFromOrigin, ctx.hopOffset ?? 0),
      liveFrom: {
        token: ctx.originToken ?? ctx.originDefId.split("::").at(-2) ?? "",
        flowNodeId: ctx.flowNodeId,
        memberId: ctx.memberId,
        role: "definition",
        traceKey: ctx.originEl.dataset.traceKey,
      },
      liveTo: {
        token,
        flowNodeId: ctx.flowNodeId,
        memberId: ctx.memberId,
        lineNumber: site.lineNumber,
        tokenIndex: site.tokenIndex,
        role: "usage",
      },
    };
  }
  const edge = buildElementPreviewEdge(
    `${ctx.edgeIdPrefix}-rel-${suffix}`,
    ctx.originEl,
    toEl,
    ctx.kind,
  );
  const hop = edgeHop(levelFromOrigin, ctx.hopOffset ?? 0);
  return hop ? { ...edge, hop } : edge;
}

function defSiteKey(
  index: MemberSymbolIndex,
  defId: string,
): Site | null {
  for (const [key, id] of index.defSites) {
    if (id !== defId) continue;
    const [lineStr, idxStr] = key.split(":");
    const lineNumber = Number(lineStr);
    const tokenIndex = Number(idxStr);
    if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) continue;
    return { lineNumber, tokenIndex };
  }
  return null;
}

function buildDefEdge(
  ctx: RelativeWalkContext,
  defId: string,
  levelFromOrigin: number,
  suffix: string,
): PreviewEdgeSpec | null {
  const pane = graphPane();
  const defEl = pane ? findLocalDefElement(pane, defId) : null;
  if (defEl?.isConnected) {
    const edge = buildElementPreviewEdge(
      `${ctx.edgeIdPrefix}-rel-${suffix}`,
      ctx.originEl,
      defEl,
      ctx.kind,
    );
    const hop = edgeHop(levelFromOrigin, ctx.hopOffset ?? 0);
    return hop ? { ...edge, hop } : edge;
  }

  const site = defSiteKey(ctx.symbolIndex, defId);
  if (!site) return null;
  const token = tokenNameAt(ctx.methodCode, ctx.methodStartLine, site);
  return {
    id: `${ctx.edgeIdPrefix}-rel-${suffix}`,
    from: { type: "element", el: ctx.originEl },
    to: resolveUsageSiteAnchor(
      ctx.flowNodeId,
      ctx.classData,
      ctx.memberId,
      site.lineNumber,
      site.tokenIndex,
      token,
    ),
    kind: ctx.kind,
    hop: edgeHop(levelFromOrigin, ctx.hopOffset ?? 0),
    liveFrom: {
      token: ctx.originToken ?? ctx.originDefId.split("::").at(-2) ?? "",
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      role: "definition",
      traceKey: ctx.originEl.dataset.traceKey,
    },
    liveTo: {
      token,
      flowNodeId: ctx.flowNodeId,
      memberId: ctx.memberId,
      lineNumber: site.lineNumber,
      tokenIndex: site.tokenIndex,
      role: "definition",
    },
  };
}

/**
 * Walk `MemberSymbolIndex` outward from a param/local def with **chained** wires
 * (each hop connects the previous token to the next — not a flat fan from origin).
 */
export function buildDefRelativePreviewEdges(ctx: RelativeWalkContext): PreviewEdgeSpec[] {
  const maxDepth = ctx.maxDepth ?? RELATIVE_MAX_DEPTH;
  const maxEdges = ctx.maxEdges ?? RELATIVE_FAN_OUT_CAP;
  const edges: PreviewEdgeSpec[] = [];
  const seenTargets = new Set<string>();

  const pushEdge = (edge: PreviewEdgeSpec | null, targetKey: string): void => {
    if (!edge || seenTargets.has(targetKey) || edges.length >= maxEdges) return;
    seenTargets.add(targetKey);
    edges.push(edge);
  };

  const originAnchor =
    ctx.preferOriginEl === true
      ? ctx.originEl
      : resolveDefChip(ctx, ctx.originDefId) ?? ctx.originEl;
  type WalkNode = { defId: string; anchorEl: HTMLElement };
  let frontier: WalkNode[] = [{ defId: ctx.originDefId, anchorEl: originAnchor }];
  const visitedDefs = new Set<string>();

  for (let level = 1; level <= maxDepth && edges.length < maxEdges; level++) {
    const nextFrontier: WalkNode[] = [];

    for (const { defId, anchorEl } of frontier) {
      if (visitedDefs.has(defId)) continue;
      visitedDefs.add(defId);

      for (const usage of usageSitesForDef(ctx.symbolIndex, defId)) {
        const usageEl = resolveSiteChip(ctx, usage);
        const usageHost = usageEl ?? originAnchor;

        if (level === 1 && ctx.includeDirectUsages) {
          pushEdge(
            buildChainedEdge(ctx, anchorEl, usageEl, level, `u1-${usage.lineNumber}-${usage.tokenIndex}`, usage),
            `u1:${usage.lineNumber}:${usage.tokenIndex}`,
          );
        }

        if (level < maxDepth) {
          for (const bindingDefId of bindingDefsFromUsage(
            ctx.symbolIndex,
            ctx.methodCode,
            ctx.methodStartLine,
            usage,
          )) {
            const chainLevel = level === 1 && !ctx.includeDirectUsages ? 2 : level + 1;
            pushEdge(
              buildChainedDefEdge(ctx, usageHost, usage, bindingDefId, chainLevel, `b-${chainLevel}-${bindingDefId}`),
              `b:${bindingDefId}`,
            );
            const bindingEl = resolveDefChip(ctx, bindingDefId);
            nextFrontier.push({
              defId: bindingDefId,
              anchorEl: bindingEl?.isConnected ? bindingEl : usageHost,
            });
          }
        }
      }

      const propLevel = level >= 2 ? level + 1 : 3;
      if (propLevel <= maxDepth + 1) {
        for (const prop of memberPropsFromReceiverUsage(
          ctx.symbolIndex,
          ctx.methodCode,
          ctx.methodStartLine,
          defId,
        )) {
          const tokens = lineTokens(ctx.methodCode, ctx.methodStartLine, prop.lineNumber);
          const receivers = memberAccessReceiverIndices(tokens, prop.tokenIndex);
          const receiverIdx = receivers[0];
          if (receiverIdx == null) continue;
          const receiverSite = { lineNumber: prop.lineNumber, tokenIndex: receiverIdx };
          const receiverEl = resolveSiteChip(ctx, receiverSite);
          const propEl = resolveSiteChip(ctx, prop);
          pushEdge(
            buildChainedEdge(
              ctx,
              receiverEl ?? anchorEl,
              propEl,
              propLevel,
              `p-${propLevel}-${prop.lineNumber}-${prop.tokenIndex}`,
              prop,
              receiverSite,
            ),
            `p:${prop.lineNumber}:${prop.tokenIndex}`,
          );
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return edges;
}

type BackwardWalkContext = {
  originEl: HTMLElement;
  symbolIndex: MemberSymbolIndex;
  methodCode: string;
  methodStartLine: number;
  flowNodeId: string;
  memberId: string;
  classData: ClassNodeData;
  kind: SemanticTokenKind;
  edgeIdPrefix: string;
  startLine: number;
  startTokenIndex: number;
  maxDepth?: number;
};

function isMemberAccessProperty(
  methodCode: string,
  methodStartLine: number,
  lineNumber: number,
  tokenIndex: number,
): boolean {
  const tokens = lineTokens(methodCode, methodStartLine, lineNumber);
  let dotIdx = tokenIndex - 1;
  while (dotIdx >= 0 && tokens[dotIdx]?.kind === "whitespace") dotIdx--;
  return dotIdx >= 0 && tokens[dotIdx]?.text === ".";
}

/**
 * Walk **upstream** from a body usage or member-access property through the
 * symbol index: `.city` ← `addr` ← `result.address` ← `result` param.
 */
export function buildBackwardLexicalRelatives(ctx: BackwardWalkContext): PreviewEdgeSpec[] {
  const maxDepth = ctx.maxDepth ?? BACKWARD_LEXICAL_MAX_DEPTH;
  const maxEdges = RELATIVE_FAN_OUT_CAP;
  const edges: PreviewEdgeSpec[] = [];
  const seenTargets = new Set<string>();
  const visitedSites = new Set<string>();

  const originToken = ctx.originEl.dataset.symbolName ?? "";
  const relCtx: RelativeWalkContext = {
    originDefId: "",
    originToken,
    originEl: ctx.originEl,
    symbolIndex: ctx.symbolIndex,
    methodCode: ctx.methodCode,
    methodStartLine: ctx.methodStartLine,
    flowNodeId: ctx.flowNodeId,
    memberId: ctx.memberId,
    classData: ctx.classData,
    kind: ctx.kind,
    edgeIdPrefix: ctx.edgeIdPrefix,
    hopOffset: 1,
  };

  const pushEdge = (edge: PreviewEdgeSpec | null, targetKey: string): void => {
    if (!edge || seenTargets.has(targetKey) || edges.length >= maxEdges) return;
    seenTargets.add(targetKey);
    edges.push(edge);
  };

  const walkSite = (site: Site, depth: number): void => {
    if (depth > maxDepth || edges.length >= maxEdges) return;
    const siteKey = `${site.lineNumber}:${site.tokenIndex}`;
    if (visitedSites.has(siteKey)) return;
    visitedSites.add(siteKey);

    if (depth >= 1) {
      pushEdge(
        buildSiteEdge(relCtx, site, depth, `back-s-${depth}-${siteKey}`),
        `s:${siteKey}`,
      );
    }

    const defId = usageTargetFor(ctx.symbolIndex, site.lineNumber, site.tokenIndex);
    if (defId && !defId.startsWith("property::")) {
      if (depth >= 1) {
        pushEdge(
          buildDefEdge(relCtx, defId, depth, `back-d-${depth}-${defId}`),
          `d:${defId}`,
        );
      }

      if (depth < maxDepth) {
        const init = bindingInitFor(ctx.symbolIndex, defId);
        if (init) {
          walkSite(init, depth + 1);
          const initTokens = lineTokens(ctx.methodCode, ctx.methodStartLine, init.lineNumber);
          for (const receiverIdx of memberAccessReceiverIndices(initTokens, init.tokenIndex)) {
            walkSite(
              { lineNumber: init.lineNumber, tokenIndex: receiverIdx },
              depth + 2,
            );
          }
        }
      }
    }

    const bindingDef = bindingDefForInit(
      ctx.symbolIndex,
      site.lineNumber,
      site.tokenIndex,
    );
    if (bindingDef && depth < maxDepth) {
      pushEdge(
        buildDefEdge(relCtx, bindingDef, depth + 1, `back-b-${bindingDef}`),
        `bd:${bindingDef}`,
      );
    }
  };

  if (isMemberAccessProperty(ctx.methodCode, ctx.methodStartLine, ctx.startLine, ctx.startTokenIndex)) {
    const tokens = lineTokens(ctx.methodCode, ctx.methodStartLine, ctx.startLine);
    for (const receiverIdx of memberAccessReceiverIndices(tokens, ctx.startTokenIndex)) {
      walkSite({ lineNumber: ctx.startLine, tokenIndex: receiverIdx }, 1);
    }
  }

  const startDefId = usageTargetFor(
    ctx.symbolIndex,
    ctx.startLine,
    ctx.startTokenIndex,
  );
  if (startDefId && !startDefId.startsWith("property::")) {
    const init = bindingInitFor(ctx.symbolIndex, startDefId);
    if (init) {
      walkSite(init, 2);
      const initTokens = lineTokens(ctx.methodCode, ctx.methodStartLine, init.lineNumber);
      for (const receiverIdx of memberAccessReceiverIndices(initTokens, init.tokenIndex)) {
        walkSite({ lineNumber: init.lineNumber, tokenIndex: receiverIdx }, 3);
      }
    }
  }

  return edges;
}
