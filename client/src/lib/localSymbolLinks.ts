export { memberDefId, localDefId } from "@/lib/localDefIds";

export type BindingSite = {
  lineNumber: number;
  tokenIndex: number;
  token: string;
};

export type MemberSymbolIndex = {
  /** usage key `${line}:${tokenIndex}` → def id or `property::name` */
  usageTargets: Map<string, string>;
  /** token positions that are definitions: `${line}:${tokenIndex}` → def id */
  defSites: Map<string, string>;
  /** binding def id → initializer token on the declaring line */
  bindingInitOf: Map<string, BindingSite>;
  /** init anchor `${line}:${tokenIndex}` → binding def id */
  bindingInitSites: Map<string, string>;
};

export { buildMemberSymbolIndex } from "@/lib/buildMemberSymbolIndex";

export function usageTargetFor(
  index: MemberSymbolIndex,
  lineNumber: number,
  tokenIndex: number,
): string | undefined {
  return index.usageTargets.get(`${lineNumber}:${tokenIndex}`);
}

export function defSiteFor(
  index: MemberSymbolIndex,
  lineNumber: number,
  tokenIndex: number,
): string | undefined {
  return index.defSites.get(`${lineNumber}:${tokenIndex}`);
}

/** Param definition id + line for a member (supports multiline signatures). */
export function paramDefForName(
  index: MemberSymbolIndex,
  memberId: string,
  paramName: string,
): { defId: string; lineNumber: number } | null {
  const prefix = `local-def::${memberId}::param::${paramName}::`;
  for (const defId of index.defSites.values()) {
    if (!defId.startsWith(prefix)) continue;
    const lineNumber = Number(defId.slice(prefix.length));
    if (!Number.isFinite(lineNumber) || lineNumber < 1) continue;
    return { defId, lineNumber };
  }
  return null;
}

export function bindingInitFor(
  index: MemberSymbolIndex,
  defId: string,
): BindingSite | undefined {
  return index.bindingInitOf.get(defId);
}

export function bindingDefForInit(
  index: MemberSymbolIndex,
  lineNumber: number,
  tokenIndex: number,
): string | undefined {
  return index.bindingInitSites.get(`${lineNumber}:${tokenIndex}`);
}
