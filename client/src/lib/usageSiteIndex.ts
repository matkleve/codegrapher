import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { Node } from "@xyflow/react";

import { tokenizeLine } from "@/lib/tokenizeLine";
import { fileLineFromSnippetIndex } from "@/lib/memberFileLine";

export type UsageSiteRecord = {
  flowNodeId: string;
  memberId: string;
  lineNumber: number;
  tokenIndex: number;
  line: string;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Param / local name on a declaring line — not a usage reference for the index. */
export function isLexicalDefinitionLine(line: string, token: string): boolean {
  if (!new RegExp(`\\b${escapeRegExp(token)}\\b`).test(line)) return false;

  const fnMatch = line.match(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (fnMatch?.[1] === token) return true;

  const bindingMatch = line.match(/\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (bindingMatch?.[1] === token) return true;

  return new RegExp(`\\b${escapeRegExp(token)}\\s*:`).test(line);
}

export function mergeUsageSiteMaps(
  into: Map<string, UsageSiteRecord[]>,
  partial: Map<string, UsageSiteRecord[]>,
): void {
  for (const [token, records] of partial) {
    const list = into.get(token);
    if (list) {
      list.push(...records);
      continue;
    }
    into.set(token, [...records]);
  }
}

function scanMemberBody(
  index: Map<string, UsageSiteRecord[]>,
  flowNodeId: string,
  memberId: string,
  code: string,
  startLine: number,
  indexedSymbols: ReadonlySet<string>,
): void {
  const add = (token: string, record: UsageSiteRecord) => {
    const list = index.get(token);
    if (list) {
      list.push(record);
      return;
    }
    index.set(token, [record]);
  };

  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNumber = fileLineFromSnippetIndex(startLine, i);
    const tokens = tokenizeLine(line).tokens;
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
      const tok = tokens[tokenIndex]!;
      if (tok.kind !== "identifier") continue;
      const token = tok.text;
      if (!indexedSymbols.has(token)) continue;
      if (isLexicalDefinitionLine(line, token)) continue;
      add(token, {
        flowNodeId,
        memberId,
        lineNumber,
        tokenIndex,
        line,
      });
    }
  }
}

/** Scan one class node — used by incremental index cache. */
export function indexUsageSitesForNode(
  node: Node,
  indexedSymbols: ReadonlySet<string>,
): Map<string, UsageSiteRecord[]> {
  const index = new Map<string, UsageSiteRecord[]>();
  if (node.type !== "class" || indexedSymbols.size === 0) return index;

  const classData = node.data as ClassNodeData;
  const flowNodeId = node.id;

  for (const method of classData.methods ?? []) {
    if (!method.code) continue;
    scanMemberBody(
      index,
      flowNodeId,
      method.id,
      method.code,
      method.startLine ?? 1,
      indexedSymbols,
    );
  }

  for (const property of classData.properties ?? []) {
    if (!property.code?.trim()) continue;
    scanMemberBody(
      index,
      flowNodeId,
      property.id,
      property.code,
      property.startLine ?? 1,
      indexedSymbols,
    );
  }

  return index;
}

/** Precompute symbol → usage sites from visible class node method bodies. */
export function buildUsageSiteIndex(
  nodes: Node[],
  indexedSymbols: ReadonlySet<string>,
): Map<string, UsageSiteRecord[]> {
  const index = new Map<string, UsageSiteRecord[]>();
  if (indexedSymbols.size === 0) return index;

  for (const node of nodes) {
    if (node.type !== "class") continue;
    mergeUsageSiteMaps(index, indexUsageSitesForNode(node, indexedSymbols));
  }

  return index;
}
