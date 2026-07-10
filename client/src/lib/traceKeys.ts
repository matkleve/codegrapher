/** Stable trace keys — used for lit/on state matching (mirrors prototype hosts). */
export function makeUsageTokenKey(
  sourceFlowId: string,
  memberId: string,
  lineNumber: number,
  token: string,
): string {
  return `${sourceFlowId}::${memberId}::${lineNumber}::${token}`;
}

export function makeMemberDefKey(flowNodeId: string, memberId: string): string {
  return `${flowNodeId}::def::${memberId}`;
}

export function makeClassDefKey(symbolName: string): string {
  return `class-def::${symbolName}`;
}

export function memberIdFromUsageKey(key: string): string | null {
  const parts = key.split("::");
  if (parts.length < 4 || parts[1] === "def") return null;
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
