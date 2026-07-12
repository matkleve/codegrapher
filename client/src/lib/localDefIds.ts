/** Stable id for a member-row definition (property or method name in header). */
export function memberDefId(memberId: string): string {
  return `local-def::member::${memberId}`;
}

/** Stable id for a parameter or local variable definition inside a method body. */
export function localDefId(
  memberId: string,
  name: string,
  line: number,
  scope: "param" | "local",
): string {
  return `local-def::${memberId}::${scope}::${name}::${line}`;
}
