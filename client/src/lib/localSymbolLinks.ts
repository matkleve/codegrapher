import { tokenizeLine } from "@/lib/tokenizeLine";
import { templateInterpolationSites } from "@/lib/templateInterpolations";

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

function extractParams(
  line: string,
  memberId: string,
  lineNumber: number,
): { name: string; tokenIndex: number; defId: string }[] {
  const tokens = tokenizeLine(line).tokens;
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

/** `for (const x of items)` loop variable + iterable source for binding init. */
function extractForOfBinding(
  line: string,
  memberId: string,
  lineNumber: number,
): {
  name: string;
  tokenIndex: number;
  defId: string;
  iterable: { tokenIndex: number; token: string };
} | null {
  const tokens = tokenizeLine(line).tokens;
  let inFor = false;
  let inParen = false;
  let decl: "const" | "let" | null = null;
  let loopVar: { name: string; tokenIndex: number; defId: string } | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "whitespace") continue;
    if (t.text === "for") {
      inFor = true;
      continue;
    }
    if (!inFor) continue;
    if (t.text === "(") {
      inParen = true;
      continue;
    }
    if (!inParen) continue;
    if (t.text === ")") break;
    if (t.text === "const" || t.text === "let") {
      decl = t.text;
      continue;
    }
    if (decl && !loopVar && t.kind === "identifier") {
      loopVar = {
        name: t.text,
        tokenIndex: i,
        defId: localDefId(memberId, t.text, lineNumber, "local"),
      };
      decl = null;
      continue;
    }
    if (loopVar && t.text === "of") {
      let j = i + 1;
      while (j < tokens.length && tokens[j]?.kind === "whitespace") j++;
      const iterable = tokens[j];
      if (iterable?.kind === "identifier") {
        return {
          ...loopVar,
          iterable: { tokenIndex: j, token: iterable.text },
        };
      }
      break;
    }
  }
  return null;
}

/** `const { a, b } = expr` destructuring bindings on one line. */
function recordDestructuringBindings(
  lineNumber: number,
  tokens: readonly { kind: string; text: string }[],
  memberId: string,
  defSites: Map<string, string>,
  scope: Map<string, string>,
): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.text !== "const" && t.text !== "let") continue;

    let j = i + 1;
    while (j < tokens.length && tokens[j]!.kind === "whitespace") j++;
    if (tokens[j]?.text !== "{") continue;

    let depth = 0;
    for (; j < tokens.length; j++) {
      const tok = tokens[j]!;
      if (tok.text === "{") depth++;
      if (tok.text === "}") {
        depth--;
        if (depth === 0) break;
        continue;
      }
      if (depth !== 1 || tok.kind !== "identifier") continue;
      const prev = tokens
        .slice(0, j)
        .reverse()
        .find((x) => x.kind !== "whitespace")?.text;
      if (prev !== "{" && prev !== ",") continue;
      const defId = localDefId(memberId, tok.text, lineNumber, "local");
      scope.set(tok.text, defId);
      defSites.set(`${lineNumber}:${j}`, defId);
    }
  }
}

/** Param on a signature continuation line (`name: Type,`) without `(`. */
function extractContinuationParams(
  line: string,
  memberId: string,
  lineNumber: number,
): { name: string; tokenIndex: number; defId: string }[] {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(")")) return [];

  const tokens = tokenizeLine(line).tokens;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "identifier" || t.text === "this") continue;
    const next = tokens.slice(i + 1).find((tok) => tok.kind !== "whitespace");
    if (next?.text !== ":") continue;
    const defId = localDefId(memberId, t.text, lineNumber, "param");
    return [{ name: t.text, tokenIndex: i, defId }];
  }
  return [];
}

/** Record initializer → binding for `const|let name = expr` on one line. */
function recordLineBinding(
  lineNumber: number,
  tokens: readonly { kind: string; text: string }[],
  defSites: Map<string, string>,
  bindingInitOf: Map<string, BindingSite>,
  bindingInitSites: Map<string, string>,
): void {
  let decl: "const" | "let" | null = null;
  let bindingDefId: string | null = null;
  let eqIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "whitespace") continue;

    if (t.text === "const" || t.text === "let") {
      decl = t.text;
      bindingDefId = null;
      continue;
    }

    if (decl && t.kind === "identifier" && !bindingDefId) {
      const defId = defSites.get(`${lineNumber}:${i}`);
      if (defId?.includes("::local::")) {
        bindingDefId = defId;
        decl = null;
      }
      continue;
    }

    if (t.text === "=" && bindingDefId) {
      eqIndex = i;
      break;
    }
  }

  if (!bindingDefId || eqIndex < 0) return;

  const bindingName = bindingDefId.split("::").at(-2) ?? null;
  let first: { index: number; token: string } | null = null;
  let rightmost: { index: number; token: string } | null = null;
  for (let i = eqIndex + 1; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.text === ";") break;
    if (t.kind === "identifier") {
      if (!first) first = { index: i, token: t.text };
      rightmost = { index: i, token: t.text };
    }
  }

  if (!rightmost) return;

  // `const importance = result.importance` — rightmost is the property token with the
  // same name as the binding; anchor on the receiver instead to avoid a same-line loop.
  const chosen =
    bindingName &&
    rightmost.token === bindingName &&
    first &&
    first.token !== bindingName
      ? first
      : rightmost;

  const site: BindingSite = {
    lineNumber,
    tokenIndex: chosen.index,
    token: chosen.token,
  };
  bindingInitOf.set(bindingDefId, site);
  bindingInitSites.set(`${lineNumber}:${chosen.index}`, bindingDefId);
}

/**
 * Build def/usage map for one member body — mirrors connectors-proto.html
 * `data-def` / `data-target` wiring for params, locals, and property refs.
 *
 * `startLine` is the 1-based file line of `code`'s first line (the member
 * signature). Keys MUST be file-absolute — `CodeLine` queries this index
 * with its own `lineNumber` prop, which is always `startLine + i`, never a
 * bare in-snippet offset.
 */
export function buildMemberSymbolIndex(
  memberId: string,
  code: string,
  startLine = 1,
): MemberSymbolIndex {
  const usageTargets = new Map<string, string>();
  const defSites = new Map<string, string>();
  const bindingInitOf = new Map<string, BindingSite>();
  const bindingInitSites = new Map<string, string>();
  const lines = code.split("\n");
  const scope = new Map<string, string>();
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNumber = startLine + lineIdx;
    const line = lines[lineIdx] ?? "";
    const trimmed = line.trim();

    if (line.includes("(")) {
      for (const p of extractParams(line, memberId, lineNumber)) {
        scope.set(p.name, p.defId);
        defSites.set(`${lineNumber}:${p.tokenIndex}`, p.defId);
      }
    } else if (lineIdx === 0 || /^\w+\s*\??\s*:/.test(trimmed)) {
      for (const p of extractContinuationParams(line, memberId, lineNumber)) {
        scope.set(p.name, p.defId);
        defSites.set(`${lineNumber}:${p.tokenIndex}`, p.defId);
      }
    }

    const forOf = extractForOfBinding(line, memberId, lineNumber);
    if (forOf) {
      scope.set(forOf.name, forOf.defId);
      defSites.set(`${lineNumber}:${forOf.tokenIndex}`, forOf.defId);
      bindingInitOf.set(forOf.defId, {
        lineNumber,
        tokenIndex: forOf.iterable.tokenIndex,
        token: forOf.iterable.token,
      });
      bindingInitSites.set(
        `${lineNumber}:${forOf.iterable.tokenIndex}`,
        forOf.defId,
      );
    }

    const tokenized = tokenizeLine(line, inBlockComment);
    inBlockComment = tokenized.inBlockComment;
    const tokens = tokenized.tokens;
    recordDestructuringBindings(lineNumber, tokens, memberId, defSites, scope);
    let prev: string | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.kind === "whitespace") continue;

      if (t.kind === "identifier") {
        const siteKey = `${lineNumber}:${i}`;
        if (defSites.has(siteKey)) {
          prev = t.text;
          continue;
        }
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

    for (const site of templateInterpolationSites(line)) {
      const defId = scope.get(site.name);
      if (defId) {
        usageTargets.set(`${lineNumber}:${site.tokenIndex}`, defId);
      }
    }

    recordLineBinding(
      lineNumber,
      tokens,
      defSites,
      bindingInitOf,
      bindingInitSites,
    );
  }

  return { usageTargets, defSites, bindingInitOf, bindingInitSites };
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
