import { camelToWords } from "@/lib/camelToWords";

export type ClassMemberItem = {
  id: string;
  label: string;
  code: string;
};

type MethodLike = { id: string; label: string; code: string };

function extractClassBodyInner(classCode: string): string {
  const open = classCode.indexOf("{");
  const close = classCode.lastIndexOf("}");
  if (open === -1 || close <= open) return classCode;
  return classCode.slice(open + 1, close);
}

function inferMemberLabel(code: string, fallback: string): string {
  const ctor = code.match(/constructor\s*\(/);
  if (ctor) return "Constructor";

  const field = code.match(
    /(?:public|private|protected|readonly|static|\s)+(\w+)\s*(?:[=:]|;)/,
  );
  if (field?.[1]) return camelToWords(field[1]);

  const firstLine = code.trim().split("\n")[0] ?? "";
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
      code: chunk,
    });
  }

  return items;
}

export function methodsForClassNode(methods: MethodLike[]): MethodLike[] {
  return methods.filter((m) => m.label !== "constructor");
}
