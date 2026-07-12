import { localDefId } from "@/lib/localDefIds";
import { tokenizeLine } from "@/lib/tokenizeLine";

export function extractParams(
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
export function extractForOfBinding(
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
export function recordDestructuringBindings(
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
export function extractContinuationParams(
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
export function recordLineBinding(
  lineNumber: number,
  tokens: readonly { kind: string; text: string }[],
  defSites: Map<string, string>,
  bindingInitOf: Map<string, { lineNumber: number; tokenIndex: number; token: string }>,
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

  const chosen =
    bindingName &&
    rightmost.token === bindingName &&
    first &&
    first.token !== bindingName
      ? first
      : rightmost;

  const site = {
    lineNumber,
    tokenIndex: chosen.index,
    token: chosen.token,
  };
  bindingInitOf.set(bindingDefId, site);
  bindingInitSites.set(`${lineNumber}:${chosen.index}`, bindingDefId);
}
