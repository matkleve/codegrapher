const DEFAULT_MAX_LEN = 28;

const TS_PRIMITIVE_TYPES = new Set([
  "any",
  "bigint",
  "boolean",
  "never",
  "null",
  "number",
  "object",
  "string",
  "symbol",
  "undefined",
  "unknown",
  "void",
]);

export function isPrimitiveTypeName(name: string): boolean {
  return TS_PRIMITIVE_TYPES.has(name);
}

function identifiersInType(type: string): string[] {
  return [...type.matchAll(/\b[A-Za-z_$][\w$]*\b/g)].map((match) => match[0]);
}

/** True when the type names a project symbol (class, interface, enum, …), not a TS primitive. */
export function isIndexedSignatureType(
  type: string,
  hasSymbol: (name: string) => boolean,
): boolean {
  const trimmed = type.trim();
  if (!trimmed) return false;
  return identifiersInType(trimmed).some(
    (id) => !isPrimitiveTypeName(id) && hasSymbol(id),
  );
}

export function signatureTypeLines(type: string): string[] {
  if (!type.includes(" | ")) return [type];
  return type
    .split(" | ")
    .map((part, index) => (index === 0 ? part.trim() : `| ${part.trim()}`));
}

export function truncateSignatureType(
  type: string,
  maxLen = DEFAULT_MAX_LEN,
): { short: string; isTruncated: boolean } {
  if (type.length <= maxLen && !type.includes(" | ")) {
    return { short: type, isTruncated: false };
  }

  if (type.includes(" | ")) {
    const parts = type.split(" | ").map((p) => p.trim());
    let short = parts[0] ?? "";
    for (let i = 1; i < parts.length; i++) {
      const next = ` | ${parts[i]}`;
      if (short.length + next.length + 4 > maxLen) {
        return { short: `${short} | ...`, isTruncated: true };
      }
      short += next;
    }
    return { short, isTruncated: parts.length > 1 };
  }

  if (type.length > maxLen) {
    return { short: `${type.slice(0, maxLen - 3)}...`, isTruncated: true };
  }

  return { short: type, isTruncated: false };
}

export function signatureTypeIsExpandable(type: string, maxLen = DEFAULT_MAX_LEN): boolean {
  return truncateSignatureType(type, maxLen).isTruncated;
}
