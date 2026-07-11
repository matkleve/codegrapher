/** Stable trace keys — used for lit/on state matching (mirrors prototype hosts). */
export function makeUsageTokenKey(
  sourceFlowId: string,
  memberId: string,
  lineNumber: number,
  token: string,
): string {
  return `${sourceFlowId}::${memberId}::${lineNumber}::${token}`;
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
  if (parts.length === 4 && parts[2] === "sig-type") return parts[1] ?? null;
  const lineNumber = Number(parts[2]);
  if (!Number.isFinite(lineNumber)) return null;
  return parts[1] ?? null;
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
