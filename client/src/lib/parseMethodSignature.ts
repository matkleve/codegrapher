export type SignatureParam = {
  name: string;
  type?: string;
};

export type MethodSignature = {
  params: SignatureParam[];
  returnType?: string;
};

function findMatchingParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findBodyStart(s: string): number {
  let paren = 0;
  let angle = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "<") angle++;
    else if (ch === ">") angle--;
    else if (ch === "{" && paren === 0 && angle === 0) return i;
    else if (ch === "=" && s[i + 1] === ">" && paren === 0 && angle === 0) {
      const rest = s.slice(i + 2);
      const brace = rest.search(/\{/);
      return brace === -1 ? i : i + 2 + brace;
    }
  }
  return -1;
}

function splitParamList(paramsStr: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let angle = 0;

  for (const ch of paramsStr) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "<") angle++;
    else if (ch === ">") angle--;
    else if (ch === "," && depth === 0 && angle === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

const PARAM_MODIFIER = /^(?:public|private|protected|readonly|static|async|override)\s+/;

function stripParamModifiers(raw: string): string {
  let trimmed = raw.trim();
  while (PARAM_MODIFIER.test(trimmed)) {
    trimmed = trimmed.replace(PARAM_MODIFIER, "").trim();
  }
  return trimmed;
}

function parseParam(raw: string): SignatureParam | null {
  const trimmed = stripParamModifiers(raw);
  if (!trimmed) return null;

  const destructured = trimmed.match(/^[{[].+[}\]]\s*(?::\s*(.+))?$/);
  if (destructured) {
    return { name: "…", type: destructured[1]?.trim() };
  }

  const typed = trimmed.match(/^(\w+)\s*\??\s*:\s*(.+)$/);
  if (typed) {
    return {
      name: typed[1],
      type: typed[2].replace(/\s*=.*$/, "").trim(),
    };
  }

  const bare = trimmed.match(/^(\w+)$/);
  if (bare) return { name: bare[1] };

  return { name: trimmed.slice(0, 32) };
}

/** Best-effort params + return type from a method's source text. */
export function parseMethodSignature(code: string): MethodSignature | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const bodyStart = findBodyStart(trimmed);
  if (bodyStart === -1) return null;

  const signature = trimmed.slice(0, bodyStart).trim();
  const openParen = signature.indexOf("(");
  if (openParen === -1) return null;

  const closeParen = findMatchingParen(signature, openParen);
  if (closeParen === -1) return null;

  const params = splitParamList(signature.slice(openParen + 1, closeParen))
    .map(parseParam)
    .filter((p): p is SignatureParam => p !== null);

  const afterParams = signature.slice(closeParen + 1).trim();
  let returnType: string | undefined;

  const arrowReturn = afterParams.match(/^:\s*([^=]+?)\s*=>/);
  if (arrowReturn) {
    returnType = arrowReturn[1].trim();
  } else {
    const colonReturn = afterParams.match(/^:\s*([^{]+)/);
    if (colonReturn) returnType = colonReturn[1].trim();
  }

  if (params.length === 0 && !returnType) return null;
  return { params, returnType };
}

/** Signature slice for collapsed-row indexing — skips method body tokenization. */
export function methodIndexCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  const bodyStart = findBodyStart(trimmed);
  if (bodyStart <= 0) return trimmed.split("\n")[0] ?? trimmed;
  return trimmed.slice(0, bodyStart).trimEnd();
}
