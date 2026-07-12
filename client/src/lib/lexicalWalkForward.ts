import {
  RELATIVE_FAN_OUT_CAP,
  RELATIVE_MAX_DEPTH,
  siteKey,
  type LexicalGraph,
  type LexicalWalkHop,
} from "@/lib/lexicalWalkCore";

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
            push(
              {
                id: `b-${chainLevel}-${bindingDefId}`,
                from: { node: "site", site: usage },
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
