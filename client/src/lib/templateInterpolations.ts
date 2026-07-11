/** Identifier names referenced inside `` `${name}` `` interpolations on one line. */
export function templateInterpolationSites(
  line: string,
): { name: string; tokenIndex: number }[] {
  const sites: { name: string; tokenIndex: number }[] = [];
  const re = /\$\{\s*([a-zA-Z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    sites.push({ name: match[1]!, tokenIndex: match.index });
  }
  return sites;
}

export type TemplatePart =
  | { kind: "text"; text: string }
  | { kind: "interpolation"; name: string; raw: string };

/** Split a template literal token into static spans and `${ident}` interpolations. */
export function parseTemplateLiteralParts(text: string): TemplatePart[] {
  if (!text.startsWith("`") || !text.endsWith("`")) {
    return [{ kind: "text", text }];
  }

  const inner = text.slice(1, -1);
  const parts: TemplatePart[] = [];
  const re = /\$\{\s*([a-zA-Z_$][\w$]*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(inner)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", text: inner.slice(last, match.index) });
    }

    let depth = 0;
    let closeIdx = -1;
    for (let j = match.index; j < inner.length; j++) {
      const ch = inner[j]!;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          closeIdx = j;
          break;
        }
      }
    }

    const raw =
      closeIdx >= 0
        ? inner.slice(match.index, closeIdx + 1)
        : inner.slice(match.index);
    parts.push({
      kind: "interpolation",
      name: match[1]!,
      raw,
    });
    last = closeIdx >= 0 ? closeIdx + 1 : inner.length;
  }

  if (last < inner.length) {
    parts.push({ kind: "text", text: inner.slice(last) });
  }

  return parts.length > 0 ? parts : [{ kind: "text", text: inner }];
}
