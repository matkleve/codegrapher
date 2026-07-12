import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import {
  bindingDefForInit,
  bindingInitFor,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import {
  BACKWARD_LEXICAL_MAX_DEPTH,
  RELATIVE_FAN_OUT_CAP,
  lineTokens,
  siteKey,
  type LexicalGraph,
  type LexicalSite,
  type LexicalWalkHop,
} from "@/lib/lexicalWalkCore";

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

  if (isMemberAccessProperty(graph, opts.startLine, opts.startTokenIndex)) {
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
