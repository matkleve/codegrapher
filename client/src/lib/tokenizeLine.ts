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

const LINE_TOKEN_RE =
  /(\s+|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|0x[\da-fA-F]+|\d+\.?\d*|[a-zA-Z_$][\w$]*|[^\w\s])/g;

export function tokenizeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let match: RegExpExecArray | null;
  LINE_TOKEN_RE.lastIndex = 0;

  while ((match = LINE_TOKEN_RE.exec(line)) !== null) {
    const text = match[0];
    if (!text) continue;

    if (/^\s+$/.test(text)) {
      tokens.push({ text, kind: "whitespace" });
      continue;
    }
    if (text.startsWith("//")) {
      tokens.push({ text, kind: "comment" });
      continue;
    }
    if (text.startsWith('"') || text.startsWith("'") || text.startsWith("`")) {
      tokens.push({ text, kind: "string" });
      continue;
    }
    if (/^\d/.test(text) || text.startsWith("0x")) {
      tokens.push({ text, kind: "number" });
      continue;
    }
    if (/^[a-zA-Z_$][\w$]*$/.test(text)) {
      tokens.push({
        text,
        kind: TS_KEYWORDS.has(text) ? "keyword" : "identifier",
      });
      continue;
    }
    tokens.push({ text, kind: "operator" });
  }

  if (tokens.length === 0 && line.length > 0) {
    tokens.push({ text: line, kind: "other" });
  }

  return tokens;
}
