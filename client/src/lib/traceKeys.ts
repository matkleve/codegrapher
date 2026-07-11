/** Stable trace keys — one per token occurrence (line + tokenIndex + name). */
export function makeUsageTokenKey(
  sourceFlowId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  token: string,
): string {
  return `${sourceFlowId}::${memberId}::${lineNumber}::${tokenIndex}::${token}`;
}

export function parseUsageTokenKey(key: string): {
  flowNodeId: string;
  memberId: string;
  lineNumber: number;
  tokenIndex: number;
  token: string;
} | null {
  const parts = key.split("::");
  if (parts.length !== 5) return null;
  const lineNumber = Number(parts[2]);
  const tokenIndex = Number(parts[3]);
  if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) return null;
  return {
    flowNodeId: parts[0]!,
    memberId: parts[1]!,
    lineNumber,
    tokenIndex,
    token: parts[4]!,
  };
}

/** Control-flow anchor (switch/if/case/else keyword or condition identifier). */
export function makeControlFlowKey(
  sourceFlowId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
): string {
  return `${sourceFlowId}::${memberId}::${lineNumber}::cf-${tokenIndex}`;
}

export function parseControlFlowKey(key: string): {
  flowNodeId: string;
  memberId: string;
  lineNumber: number;
  tokenIndex: number;
} | null {
  const parts = key.split("::");
  if (parts.length !== 4) return null;
  const lineNumber = Number(parts[2]);
  const tokenPart = parts[3] ?? "";
  if (!tokenPart.startsWith("cf-")) return null;
  const tokenIndex = Number(tokenPart.slice("cf-".length));
  if (!Number.isFinite(lineNumber) || !Number.isFinite(tokenIndex)) return null;
  return {
    flowNodeId: parts[0]!,
    memberId: parts[1]!,
    lineNumber,
    tokenIndex,
  };
}

/** Param name chip in the member signature header (distinct from body-line defs). */
export function makeSigParamDefKey(
  flowNodeId: string,
  memberId: string,
  paramName: string,
): string {
  return `${flowNodeId}::${memberId}::sig-param::${paramName}`;
}

/** Signature tag type reference (header chips, not body line numbers). */
export function makeSignatureTypeKey(
  flowNodeId: string,
  memberId: string,
  symbolName: string,
): string {
  return `${flowNodeId}::${memberId}::sig-type::${symbolName}`;
}

export function makeMemberDefKey(flowNodeId: string, memberId: string): string {
  return `${flowNodeId}::def::${memberId}`;
}

export function makeClassDefKey(symbolName: string): string {
  return `class-def::${symbolName}`;
}

export function makeImportSpecKey(
  sourceFlowId: string,
  memberId: string,
  lineNumber: number,
  specifier: string,
): string {
  const spec = specifier.replace(/^['"]|['"]$/g, "");
  return `${sourceFlowId}::${memberId}::${lineNumber}::import::${spec}`;
}

export function memberIdFromUsageKey(key: string): string | null {
  const parts = key.split("::");
  if (parts.length < 4 || parts[1] === "def") return null;
  if (parts[2] === "sig-type" || parts[2] === "sig-param") return parts[1] ?? null;
  const parsed = parseUsageTokenKey(key);
  return parsed?.memberId ?? null;
}

export function tokenIndexFromChipKey(chipKey: string): number {
  const n = Number(chipKey.split("-").pop());
  return Number.isFinite(n) ? n : 0;
}

export function memberIdFromDefKey(key: string): string | null {
  const parts = key.split("::");
  if (parts.length === 3 && parts[1] === "def") return parts[2] ?? null;
  return null;
}

export function flowNodeIdFromDefKey(key: string): string | null {
  const parts = key.split("::");
  if (parts.length === 3 && parts[1] === "def") return parts[0] ?? null;
  return null;
}
