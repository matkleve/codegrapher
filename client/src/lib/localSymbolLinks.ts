import { tokenizeLine } from "@/lib/tokenizeLine";

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

export type MemberSymbolIndex = {
  /** usage key `${line}:${tokenIndex}` → def id or `property::name` */
  usageTargets: Map<string, string>;
  /** token positions that are definitions: `${line}:${tokenIndex}` → def id */
  defSites: Map<string, string>;
};

function extractParams(
  line: string,
  memberId: string,
  lineNumber: number,
): { name: string; tokenIndex: number; defId: string }[] {
  const tokens = tokenizeLine(line);
  const out: { name: string; tokenIndex: number; defId: string }[] = [];
  let inParams = false;
  let pendingName: string | null = null;
  let pendingIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.text === "(") {
      inParams = true;
      continue;
    }
    if (t.text === ")") break;
    if (!inParams) continue;

    if (t.kind === "identifier" && t.text !== "this") {
      pendingName = t.text;
      pendingIndex = i;
      continue;
    }
    if (t.text === ":" && pendingName) {
      const defId = localDefId(memberId, pendingName, lineNumber, "param");
      out.push({ name: pendingName, tokenIndex: pendingIndex, defId });
      pendingName = null;
    }
    if (t.text === ",") {
      pendingName = null;
    }
  }

  return out;
}

/**
 * Build def/usage map for one member body — mirrors connectors-proto.html
 * `data-def` / `data-target` wiring for params, locals, and property refs.
 */
export function buildMemberSymbolIndex(
  memberId: string,
  code: string,
): MemberSymbolIndex {
  const usageTargets = new Map<string, string>();
  const defSites = new Map<string, string>();
  const lines = code.split("\n");
  const scope = new Map<string, string>();

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNumber = lineIdx + 1;
    const line = lines[lineIdx] ?? "";

    if (lineNumber === 1 || line.includes("(")) {
      for (const p of extractParams(line, memberId, lineNumber)) {
        scope.set(p.name, p.defId);
        defSites.set(`${lineNumber}:${p.tokenIndex}`, p.defId);
      }
    }

    const tokens = tokenizeLine(line);
    let prev: string | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.kind === "whitespace") continue;

      if (t.kind === "identifier") {
        if (prev === "const" || prev === "let") {
          const defId = localDefId(memberId, t.text, lineNumber, "local");
          scope.set(t.text, defId);
          defSites.set(`${lineNumber}:${i}`, defId);
        } else if (prev === ".") {
          usageTargets.set(`${lineNumber}:${i}`, `property::${t.text}`);
        } else if (prev !== ":" && prev !== "function" && prev !== "class" && prev !== "interface") {
          const defId = scope.get(t.text);
          if (defId) usageTargets.set(`${lineNumber}:${i}`, defId);
        }
        prev = t.text;
        continue;
      }

      prev = t.text;
    }
  }

  return { usageTargets, defSites };
}

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
