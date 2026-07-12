import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import {
  bindingDefForInit,
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

export function parseSiteKey(key: string): LexicalSite | null {
  const [lineStr, idxStr] = key.split(":");
  const lineNumber = Number(lineStr);
  const tokenIndex = Number(idxStr);
  if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) return null;
  return { lineNumber, tokenIndex };
}

export function lineTokens(
  methodCode: string,
  methodStartLine: number,
  lineNumber: number,
) {
  const line = methodCode.split("\n")[lineNumber - methodStartLine] ?? "";
  return tokenizeLine(line).tokens;
}

function tokenNameAt(graph: LexicalGraph, site: LexicalSite): string {
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

export function tokenAtSite(graph: LexicalGraph, site: LexicalSite): string {
  return tokenNameAt(graph, site);
}
