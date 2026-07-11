import { camelToWords } from "@/lib/camelToWords";

export type ClassMemberItem = {
  id: string;
  label: string;
  /** Raw identifier for symbol index / trace (before camelToWords display label). */
  symbolName?: string;
  code: string;
};

/**
 * Anchored to the start of the (comment-stripped) declaration so it captures the
 * property/field identifier itself — never a type name. Handles interface-style
 * `name?: Type;` (no modifier) as well as class fields with modifiers/decorators.
 */
const FIELD_NAME_RE =
  /^(?:@\w+(?:\([^)]*\))?\s+)*(?:(?:public|private|protected|readonly|static|abstract|declare)\s+)*(\w+)\s*\??\s*(?:[:=;]|$)/;

/** Strips leading `//` and `/* ... *\/` comments so declaration regexes see the real code. */
function stripLeadingComments(code: string): string {
  let text = code.trimStart();
  for (;;) {
    if (text.startsWith("//")) {
      const nl = text.indexOf("\n");
      text = nl === -1 ? "" : text.slice(nl + 1).trimStart();
      continue;
    }
    if (text.startsWith("/*")) {
      const end = text.indexOf("*/");
      text = end === -1 ? "" : text.slice(end + 2).trimStart();
      continue;
    }
    return text;
  }
}

/** Field/property identifier from a member chunk, if any. */
export function inferSymbolName(code: string): string | null {
  const trimmed = stripLeadingComments(code);
  if (/^constructor\s*\(/.test(trimmed)) return null;

  const field = trimmed.match(FIELD_NAME_RE);
  return field?.[1] ?? null;
}

type MethodLike = { id: string; label: string; code: string };

/**
 * `classCode` is the declaration's full text, which includes any leading
 * `@Decorator({ ... })` (e.g. Angular `@Injectable`/`@Component`). Those carry their
 * own `{ ... }`, so a naive `indexOf("{")` grabs the decorator's brace instead of the
 * class body's — search for the opening brace only after the `class`/`interface`
 * keyword to avoid slicing decorator config text in as a bogus member.
 */
function extractClassBodyInner(classCode: string): string {
  const keyword = classCode.search(/\b(?:class|interface)\b/);
  const searchFrom = keyword === -1 ? 0 : keyword;
  const open = classCode.indexOf("{", searchFrom);
  const close = classCode.lastIndexOf("}");
  if (open === -1 || close <= open) return classCode;
  return classCode.slice(open + 1, close);
}

function inferMemberLabel(code: string, fallback: string): string {
  const stripped = stripLeadingComments(code);
  const ctor = stripped.match(/^constructor\s*\(/);
  if (ctor) return "Constructor";

  const field = stripped.match(FIELD_NAME_RE);
  if (field?.[1]) return camelToWords(field[1]);

  const firstLine = stripped.split("\n")[0] ?? "";
  const short = firstLine.slice(0, 48).trim();
  return short ? camelToWords(short.replace(/[;{].*$/, "")) : fallback;
}

function splitDeclarations(inner: string): string[] {
  const chunks: string[] = [];
  let current = "";
  let depth = 0;

  for (const line of inner.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) current += "\n";
      continue;
    }

    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;

    const isNewDecl =
      !current ||
      /^(?:@\w+|(?:public|private|protected|readonly|static|declare|abstract)\b|constructor\b|\w+\s*[=:(])/.test(
        trimmed,
      );

    if (isNewDecl && current.trim()) {
      chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }

    if (depth <= 0 && /[;}]$/.test(trimmed) && !trimmed.startsWith("}")) {
      chunks.push(current.trim());
      current = "";
      depth = 0;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 2 && !/^[\s{}]+$/.test(c));
}

function looksLikeMethod(code: string): boolean {
  const t = code.trim();
  if (/^constructor\s*\(/.test(t)) return false;
  return /\)\s*[:{]/.test(t) || /\)\s*=>/.test(t);
}

/** Class-level members (fields, constructor, decorators) excluding regular methods. */
export function buildClassProperties(
  graphNodeId: string,
  classCode: string,
  methods: MethodLike[],
): ClassMemberItem[] {
  if (!classCode.trim()) return [];

  const regularMethods = methods.filter(
    (m) => m.label !== "constructor" && m.code.trim(),
  );
  const constructor = methods.find((m) => m.label === "constructor");

  let inner = extractClassBodyInner(classCode);
  for (const m of regularMethods) {
    inner = inner.split(m.code).join("\n");
  }

  const items: ClassMemberItem[] = [];

  if (constructor?.code.trim()) {
    items.push({
      id: `${constructor.id}:ctor`,
      label: "Constructor",
      code: constructor.code.trim(),
    });
  }

  for (const chunk of splitDeclarations(inner)) {
    if (looksLikeMethod(chunk)) continue;
    const label = inferMemberLabel(chunk, "Member");
    items.push({
      id: `${graphNodeId}:prop:${items.length}:${label.replace(/\s+/g, "_")}`,
      label,
      symbolName: inferSymbolName(chunk) ?? undefined,
      code: chunk,
    });
  }

  return items;
}

export function methodsForClassNode(methods: MethodLike[]): MethodLike[] {
  return methods.filter((m) => m.label !== "constructor");
}
