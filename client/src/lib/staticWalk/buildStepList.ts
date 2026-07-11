import type { SimStatementKind } from "@/lib/staticWalk/types";

export type ParsedStatement = {
  lineNumber: number;
  text: string;
  kind: SimStatementKind;
};

const STMT_END = /;\s*$/;

function classifyStatement(text: string): SimStatementKind {
  const t = text.trim();
  if (t.startsWith("return ")) return "return";
  if (t.startsWith("if ") || t.startsWith("if(")) return "if";
  if (t.startsWith("await ")) return "await";
  if (/^(const|let|var)\s/.test(t)) return "declaration";
  if (/=/.test(t) && !t.startsWith("return")) return "assignment";
  if (/\w\s*\(/.test(t) && !t.startsWith("if")) return "call";
  return "other";
}

/** Lightweight statement split for static-walk v1 (no full TS parse). */
export function buildStepList(code: string, startLine = 1, endLine?: number): ParsedStatement[] {
  const lines = code.split("\n");
  const last = endLine ?? lines.length;
  const steps: ParsedStatement[] = [];

  for (let i = startLine - 1; i < last && i < lines.length; i++) {
    const text = lines[i] ?? "";
    const trimmed = text.trim();
    if (!trimmed || trimmed === "{" || trimmed === "}") continue;
    if (trimmed.startsWith("//")) continue;

    const lineNumber = i + 1;
    steps.push({
      lineNumber,
      text,
      kind: classifyStatement(trimmed.endsWith(";") ? trimmed : `${trimmed};`),
    });
  }

  return steps.filter((s) => STMT_END.test(s.text.trim()) || s.kind !== "other");
}
