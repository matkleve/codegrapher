const TS_KEYWORDS = new Set([
  "abstract",
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "of",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

export type CodeTokenKind =
  | "identifier"
  | "keyword"
  | "operator"
  | "whitespace"
  | "string"
  | "number"
  | "comment"
  | "other";

export type CodeToken = {
  text: string;
  kind: CodeTokenKind;
};

export type TokenizeLineResult = {
  tokens: CodeToken[];
  inBlockComment: boolean;
};

function readQuotedString(line: string, start: number): number {
  const quote = line[start]!;
  let i = start + 1;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) return i + 1;
    i++;
  }
  return line.length;
}

function readTemplateString(line: string, start: number): number {
  let i = start + 1;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`") return i + 1;
    i++;
  }
  return line.length;
}

function pushComment(tokens: CodeToken[], text: string): void {
  if (text) tokens.push({ text, kind: "comment" });
}

/** Whether a 1-based line starts inside an unclosed `/*` block from earlier lines. */
export function blockCommentOpenAtLineStart(
  code: string,
  lineNumber: number,
): boolean {
  if (lineNumber <= 1) return false;

  const lines = code.split("\n");
  let inBlock = false;
  for (let i = 0; i < lineNumber - 1; i++) {
    inBlock = tokenizeLine(lines[i] ?? "", inBlock).inBlockComment;
  }
  return inBlock;
}

export function tokenizeLine(
  line: string,
  inBlockComment = false,
): TokenizeLineResult {
  const tokens: CodeToken[] = [];
  let i = 0;
  let inBlock = inBlockComment;

  while (i < line.length) {
    if (inBlock) {
      const close = line.indexOf("*/", i);
      if (close === -1) {
        pushComment(tokens, line.slice(i));
        return { tokens, inBlockComment: true };
      }
      pushComment(tokens, line.slice(i, close + 2));
      i = close + 2;
      inBlock = false;
      continue;
    }

    const ch = line[i]!;
    if (ch === '"' || ch === "'") {
      const end = readQuotedString(line, i);
      tokens.push({ text: line.slice(i, end), kind: "string" });
      i = end;
      continue;
    }
    if (ch === "`") {
      const end = readTemplateString(line, i);
      tokens.push({ text: line.slice(i, end), kind: "string" });
      i = end;
      continue;
    }

    if (line.startsWith("//", i)) {
      pushComment(tokens, line.slice(i));
      return { tokens, inBlockComment: false };
    }

    if (line.startsWith("/*", i)) {
      const close = line.indexOf("*/", i + 2);
      if (close === -1) {
        pushComment(tokens, line.slice(i));
        return { tokens, inBlockComment: true };
      }
      pushComment(tokens, line.slice(i, close + 2));
      i = close + 2;
      continue;
    }

    const wsMatch = /^\s+/.exec(line.slice(i));
    if (wsMatch) {
      tokens.push({ text: wsMatch[0], kind: "whitespace" });
      i += wsMatch[0].length;
      continue;
    }

    const numMatch = /^(0x[\da-fA-F]+|\d+\.?\d*)/.exec(line.slice(i));
    if (numMatch) {
      tokens.push({ text: numMatch[0], kind: "number" });
      i += numMatch[0].length;
      continue;
    }

    const idMatch = /^[a-zA-Z_$][\w$]*/.exec(line.slice(i));
    if (idMatch) {
      const text = idMatch[0];
      tokens.push({
        text,
        kind: TS_KEYWORDS.has(text) ? "keyword" : "identifier",
      });
      i += text.length;
      continue;
    }

    tokens.push({ text: ch, kind: "operator" });
    i += 1;
  }

  if (tokens.length === 0 && line.length > 0) {
    tokens.push({ text: line, kind: "other" });
  }

  return { tokens, inBlockComment: inBlock };
}
