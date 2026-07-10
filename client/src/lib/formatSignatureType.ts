const DEFAULT_MAX_LEN = 28;

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
