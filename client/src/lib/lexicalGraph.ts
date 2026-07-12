import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import {
  bindingDefForInit,
  bindingInitFor,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import { tokenizeLine } from "@/lib/tokenizeLine";

/** Max BFS depth from a definition when fanning out lexical relatives. */
export const RELATIVE_MAX_DEPTH = 5;

/** Max backward hops from a usage / member-access hover. */
export const BACKWARD_LEXICAL_MAX_DEPTH = 5;

/** Max preview wires from one relative walk (nearest-first). */
export const RELATIVE_FAN_OUT_CAP = 24;

export const TRACE_DEPTH_DOWN = RELATIVE_MAX_DEPTH;
export const TRACE_DEPTH_UP = BACKWARD_LEXICAL_MAX_DEPTH;
export const TRACE_VISUAL_HOP_MAX = 3;

export type LexicalSite = {
  lineNumber: number;
  tokenIndex: number;
};

export type LexicalEdgeKind = "usage" | "binding-init" | "member-access";

export type LexicalHopEndpoint =
  | { node: "def"; defId: string }
  | { node: "site"; site: LexicalSite };

export type LexicalWalkHop = {
  id: string;
  from: LexicalHopEndpoint;
  to: LexicalHopEndpoint;
  kind: LexicalEdgeKind;
  depth: number;
};

export type MemberPropRoute =
  | { type: "from-def"; defId: string; prop: LexicalSite }
  | { type: "from-site"; site: LexicalSite; prop: LexicalSite };

export type LexicalGraph = {
  usagesOfDef: Map<string, LexicalSite[]>;
  defSiteOf: Map<string, LexicalSite>;
  bindingDefsFromSite: Map<string, string[]>;
  memberPropsFromDef: Map<string, MemberPropRoute[]>;
  methodCode: string;
  methodStartLine: number;
};

export function siteKey(site: LexicalSite): string {
  return `${site.lineNumber}:${site.tokenIndex}`;
}

function parseSiteKey(key: string): LexicalSite | null {
  const [lineStr, idxStr] = key.split(":");
  const lineNumber = Number(lineStr);
  const tokenIndex = Number(idxStr);
  if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) return null;
  return { lineNumber, tokenIndex };
}

function lineTokens(methodCode: string, methodStartLine: number, lineNumber: number) {
  const line = methodCode.split("\n")[lineNumber - methodStartLine] ?? "";
  return tokenizeLine(line).tokens;
}

function tokenNameAt(
  graph: LexicalGraph,
  site: LexicalSite,
): string {
  const tokens = lineTokens(graph.methodCode, graph.methodStartLine, site.lineNumber);
  return tokens[site.tokenIndex]?.text ?? "";
}

function bindingDefsFromUsage(
  index: MemberSymbolIndex,
  graph: LexicalGraph,
  usage: LexicalSite,
): string[] {
  const found = new Set<string>();
  const direct = bindingDefForInit(index, usage.lineNumber, usage.tokenIndex);
  if (direct) found.add(direct);

  const tokens = lineTokens(graph.methodCode, graph.methodStartLine, usage.lineNumber);
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
  graph: LexicalGraph,
  defId: string,
): LexicalSite[] {
  const usages = graph.usagesOfDef.get(defId) ?? [];
  const out: LexicalSite[] = [];
  for (const usage of usages) {
    const tokens = lineTokens(graph.methodCode, graph.methodStartLine, usage.lineNumber);
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

function memberPropRoutes(
  index: MemberSymbolIndex,
  graph: LexicalGraph,
  defId: string,
): MemberPropRoute[] {
  const routes: MemberPropRoute[] = [];
  for (const prop of memberPropsFromReceiverUsage(index, graph, defId)) {
    const tokens = lineTokens(graph.methodCode, graph.methodStartLine, prop.lineNumber);
    const receivers = memberAccessReceiverIndices(tokens, prop.tokenIndex);
    const receiverIdx = receivers[0];
    if (receiverIdx == null) continue;
    const receiverSite = { lineNumber: prop.lineNumber, tokenIndex: receiverIdx };

    if (receiverSite.lineNumber === prop.lineNumber) {
      const receiverDefId = usageTargetFor(
        index,
        receiverSite.lineNumber,
        receiverSite.tokenIndex,
      );
      if (!receiverDefId || receiverDefId.startsWith("property::")) continue;
      const defSite = graph.defSiteOf.get(receiverDefId);
      if (!defSite || defSite.lineNumber === prop.lineNumber) continue;
      routes.push({ type: "from-def", defId: receiverDefId, prop });
    } else {
      routes.push({ type: "from-site", site: receiverSite, prop });
    }
  }
  return routes;
}

/** Build adjacency lookups from an existing {@link MemberSymbolIndex}. */
export function buildLexicalGraph(
  index: MemberSymbolIndex,
  methodCode: string,
  methodStartLine: number,
): LexicalGraph {
  const usagesOfDef = new Map<string, LexicalSite[]>();
  for (const [key, defId] of index.usageTargets) {
    if (defId.startsWith("property::")) continue;
    const site = parseSiteKey(key);
    if (!site) continue;
    const list = usagesOfDef.get(defId);
    if (list) list.push(site);
    else usagesOfDef.set(defId, [site]);
  }

  const defSiteOf = new Map<string, LexicalSite>();
  for (const [key, defId] of index.defSites) {
    if (defSiteOf.has(defId)) continue;
    const site = parseSiteKey(key);
    if (site) defSiteOf.set(defId, site);
  }

  const graph: LexicalGraph = {
    usagesOfDef,
    defSiteOf,
    bindingDefsFromSite: new Map(),
    memberPropsFromDef: new Map(),
    methodCode,
    methodStartLine,
  };

  for (const sites of usagesOfDef.values()) {
    for (const usage of sites) {
      const bindings = bindingDefsFromUsage(index, graph, usage);
      if (bindings.length > 0) {
        graph.bindingDefsFromSite.set(siteKey(usage), bindings);
      }
    }
  }

  for (const defId of usagesOfDef.keys()) {
    const routes = memberPropRoutes(index, graph, defId);
    if (routes.length > 0) graph.memberPropsFromDef.set(defId, routes);
  }

  return graph;
}

export type WalkLexicalOptions = {
  maxDepth?: number;
  maxEdges?: number;
  includeDirectUsages?: boolean;
};

/** Chained forward walk from a param/local definition. */
export function walkLexicalForward(
  graph: LexicalGraph,
  originDefId: string,
  opts: WalkLexicalOptions = {},
): LexicalWalkHop[] {
  const maxDepth = opts.maxDepth ?? RELATIVE_MAX_DEPTH;
  const maxEdges = opts.maxEdges ?? RELATIVE_FAN_OUT_CAP;
  const hops: LexicalWalkHop[] = [];
  const seen = new Set<string>();

  const push = (hop: LexicalWalkHop, key: string): void => {
    if (seen.has(key) || hops.length >= maxEdges) return;
    seen.add(key);
    hops.push(hop);
  };

  type Frontier = { defId: string };
  let frontier: Frontier[] = [{ defId: originDefId }];
  const visitedDefs = new Set<string>();

  for (let level = 1; level <= maxDepth && hops.length < maxEdges; level++) {
    const nextFrontier: Frontier[] = [];

    for (const { defId } of frontier) {
      if (visitedDefs.has(defId)) continue;
      visitedDefs.add(defId);

      const usages = graph.usagesOfDef.get(defId) ?? [];
      for (const usage of usages) {
        if (level === 1 && opts.includeDirectUsages) {
          push(
            {
              id: `u1-${usage.lineNumber}-${usage.tokenIndex}`,
              from: { node: "def", defId },
              to: { node: "site", site: usage },
              kind: "usage",
              depth: level,
            },
            `u1:${siteKey(usage)}`,
          );
        }

        if (level < maxDepth) {
          const bindings = graph.bindingDefsFromSite.get(siteKey(usage)) ?? [];
          for (const bindingDefId of bindings) {
            const chainLevel = level === 1 && !opts.includeDirectUsages ? 2 : level + 1;
            const bindingSite = graph.defSiteOf.get(bindingDefId);
            const sameLineBinding =
              bindingSite != null && bindingSite.lineNumber === usage.lineNumber;
            push(
              {
                id: `b-${chainLevel}-${bindingDefId}`,
                from: sameLineBinding
                  ? { node: "def", defId }
                  : { node: "site", site: usage },
                to: { node: "def", defId: bindingDefId },
                kind: "binding-init",
                depth: chainLevel,
              },
              `b:${bindingDefId}`,
            );
            nextFrontier.push({ defId: bindingDefId });
          }
        }
      }

      const propLevel = level >= 2 ? level + 1 : 3;
      if (propLevel <= maxDepth + 1) {
        for (const route of graph.memberPropsFromDef.get(defId) ?? []) {
          if (route.type === "from-def") {
            push(
              {
                id: `p-${propLevel}-${route.prop.lineNumber}-${route.prop.tokenIndex}`,
                from: { node: "def", defId: route.defId },
                to: { node: "site", site: route.prop },
                kind: "member-access",
                depth: propLevel,
              },
              `p:${siteKey(route.prop)}`,
            );
          } else {
            push(
              {
                id: `p-${propLevel}-${route.prop.lineNumber}-${route.prop.tokenIndex}`,
                from: { node: "site", site: route.site },
                to: { node: "site", site: route.prop },
                kind: "member-access",
                depth: propLevel,
              },
              `p:${siteKey(route.prop)}`,
            );
          }
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return hops;
}

export type WalkLexicalBackwardOptions = {
  maxDepth?: number;
  maxEdges?: number;
  startLine: number;
  startTokenIndex: number;
};

function isMemberAccessProperty(
  graph: LexicalGraph,
  lineNumber: number,
  tokenIndex: number,
): boolean {
  const tokens = lineTokens(graph.methodCode, graph.methodStartLine, lineNumber);
  let dotIdx = tokenIndex - 1;
  while (dotIdx >= 0 && tokens[dotIdx]?.kind === "whitespace") dotIdx--;
  return dotIdx >= 0 && tokens[dotIdx]?.text === ".";
}

/** Upstream walk from a body usage or member-access property. */
export function walkLexicalBackward(
  graph: LexicalGraph,
  index: MemberSymbolIndex,
  opts: WalkLexicalBackwardOptions,
): LexicalWalkHop[] {
  const maxDepth = opts.maxDepth ?? BACKWARD_LEXICAL_MAX_DEPTH;
  const maxEdges = RELATIVE_FAN_OUT_CAP;
  const hops: LexicalWalkHop[] = [];
  const seen = new Set<string>();
  const visitedSites = new Set<string>();

  const push = (hop: LexicalWalkHop, key: string): void => {
    if (seen.has(key) || hops.length >= maxEdges) return;
    seen.add(key);
    hops.push(hop);
  };

  const originSite: LexicalSite = {
    lineNumber: opts.startLine,
    tokenIndex: opts.startTokenIndex,
  };

  const walkSite = (site: LexicalSite, depth: number): void => {
    if (depth > maxDepth || hops.length >= maxEdges) return;
    const key = siteKey(site);
    if (visitedSites.has(key)) return;
    visitedSites.add(key);

    if (depth >= 1) {
      push(
        {
          id: `back-s-${depth}-${key}`,
          from: { node: "site", site: originSite },
          to: { node: "site", site },
          kind: "usage",
          depth,
        },
        `s:${key}`,
      );
    }

    const defId = usageTargetFor(index, site.lineNumber, site.tokenIndex);
    if (defId && !defId.startsWith("property::")) {
      if (depth >= 1) {
        push(
          {
            id: `back-d-${depth}-${defId}`,
            from: { node: "site", site: originSite },
            to: { node: "def", defId },
            kind: "usage",
            depth,
          },
          `d:${defId}`,
        );
      }

      if (depth < maxDepth) {
        const init = bindingInitFor(index, defId);
        if (init) {
          walkSite(init, depth + 1);
          const initTokens = lineTokens(
            graph.methodCode,
            graph.methodStartLine,
            init.lineNumber,
          );
          for (const receiverIdx of memberAccessReceiverIndices(
            initTokens,
            init.tokenIndex,
          )) {
            walkSite(
              { lineNumber: init.lineNumber, tokenIndex: receiverIdx },
              depth + 2,
            );
          }
        }
      }
    }

    const bindingDef = bindingDefForInit(index, site.lineNumber, site.tokenIndex);
    if (bindingDef && depth < maxDepth) {
      push(
        {
          id: `back-b-${bindingDef}`,
          from: { node: "site", site: originSite },
          to: { node: "def", defId: bindingDef },
          kind: "binding-init",
          depth: depth + 1,
        },
        `bd:${bindingDef}`,
      );
    }
  };

  if (
    isMemberAccessProperty(graph, opts.startLine, opts.startTokenIndex)
  ) {
    const tokens = lineTokens(
      graph.methodCode,
      graph.methodStartLine,
      opts.startLine,
    );
    for (const receiverIdx of memberAccessReceiverIndices(
      tokens,
      opts.startTokenIndex,
    )) {
      walkSite({ lineNumber: opts.startLine, tokenIndex: receiverIdx }, 1);
    }
  }

  const startDefId = usageTargetFor(
    index,
    opts.startLine,
    opts.startTokenIndex,
  );
  if (startDefId && !startDefId.startsWith("property::")) {
    const init = bindingInitFor(index, startDefId);
    if (init) {
      walkSite(init, 2);
      const initTokens = lineTokens(
        graph.methodCode,
        graph.methodStartLine,
        init.lineNumber,
      );
      for (const receiverIdx of memberAccessReceiverIndices(
        initTokens,
        init.tokenIndex,
      )) {
        walkSite(
          { lineNumber: init.lineNumber, tokenIndex: receiverIdx },
          3,
        );
      }
    }
  }

  return hops;
}

export function tokenAtSite(graph: LexicalGraph, site: LexicalSite): string {
  return tokenNameAt(graph, site);
}
