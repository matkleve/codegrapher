import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId } from "@/lib/ctrlPreviewHandles";
import { getByMemberId } from "@/lib/elementRegistry";
import { makeUsageTokenKey, memberIdFromDefKey } from "@/lib/traceKeys";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { GraphData, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

const WORD_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;

const HOP_OPACITY: Record<number, number> = {
  2: 0.5,
  3: 0.25,
};

function parseTraceToken(tokenKey: string): string | null {
  if (tokenKey.includes("::import::")) return null;

  const memberId = memberIdFromDefKey(tokenKey);
  if (memberId) {
    const row = getByMemberId(memberId);
    const name = row?.querySelector<HTMLElement>(".member-row-label")?.dataset.symbolName;
    return name ?? null;
  }

  const parts = tokenKey.split("::");
  if (parts.length === 4 && parts[2] === "sig-type") {
    return parts[3] ?? null;
  }
  if (parts.length < 4) return null;
  return parts[parts.length - 1] ?? null;
}

function calleesOnLine(line: string, indexed: ReadonlySet<string>): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  WORD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORD_RE.exec(line)) !== null) {
    const token = match[1]!;
    if (!indexed.has(token) || seen.has(token)) continue;
    const after = line.slice(match.index + token.length);
    if (!/^\s*\(/.test(after)) continue;
    seen.add(token);
    found.push(token);
  }
  return found;
}

function usageChip(
  record: UsageSiteRecord,
  token: string,
): HTMLElement | null {
  const key = makeUsageTokenKey(
    record.flowNodeId,
    record.memberId,
    record.lineNumber,
    token,
  );
  return document.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(key)}"]`,
  );
}

/** BFS N-hop usage wires beyond the 1-hop set already in previewEdges. */
export function buildTransitiveEdges(
  traceTokenKey: string,
  graphData: GraphData,
  usageSiteIndex: Map<string, UsageSiteRecord[]>,
  hopDepth: number,
  getNode: (id: string) => Node | undefined,
  symbols: Map<string, SymbolEntry[]>,
): PreviewEdgeSpec[] {
  const rootToken = parseTraceToken(traceTokenKey);
  if (!rootToken || hopDepth < 2) return [];

  const indexed = new Set(usageSiteIndex.keys());
  const hop1Sites = new Set(
    (usageSiteIndex.get(rootToken) ?? []).map(
      (r) => `${r.flowNodeId}::${r.memberId}::${r.lineNumber}`,
    ),
  );

  const resolved = resolveVisibleTarget(rootToken, symbols, graphData, getNode);
  if (!resolved || resolved.mode !== "graph") return [];

  const edges: PreviewEdgeSpec[] = [];
  const seenTargets = new Set<string>(hop1Sites);

  let frontier: string[] = [rootToken];
  const visitedTokens = new Set<string>([rootToken]);

  for (let hop = 2; hop <= hopDepth; hop++) {
    const nextFrontier: string[] = [];
    const opacity = HOP_OPACITY[hop] ?? 0.25;

    for (const token of frontier) {
      const sites = usageSiteIndex.get(token) ?? [];
      for (const site of sites) {
        for (const callee of calleesOnLine(site.line, indexed)) {
          if (visitedTokens.has(callee)) continue;
          visitedTokens.add(callee);
          nextFrontier.push(callee);
        }
      }
    }

    for (const token of nextFrontier) {
      const sites = usageSiteIndex.get(token) ?? [];
      for (const site of sites) {
        const siteKey = `${site.flowNodeId}::${site.memberId}::${site.lineNumber}`;
        if (seenTargets.has(siteKey)) continue;
        seenTargets.add(siteKey);

        const chip = usageChip(site, token);
        if (!chip?.isConnected) continue;

        const edgeId = ctrlPreviewEdgeId(
          resolved.flowNodeId,
          `transitive-${hop}-${siteKey}::${token}`,
        );
        const edge = buildUsagePreviewEdge(edgeId, resolved, chip, rootToken);
        edges.push({ ...edge, hop, opacity });
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return edges;
}
