import type {
  SimDiagnostic,
  SimStatementKind,
  SimStepDetail,
  SimValue,
} from "@/lib/staticWalk/types";
import { extractParamNames, scopeAtStep } from "@/lib/staticWalk/scopeAtStep";

const DECL_RE = /^(?:const|let|var)\s+(\w+)\s*=\s*(.+);$/;
const ASSIGN_RE = /^(\w+)\s*=\s*(.+);$/;
const IF_RE = /^if\s*\((.+)\)/;
const RETURN_RE = /^return\s+(.+);$/;
const CALL_RE = /(\w+)\s*\(/;
const SKIP_IDS = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "new",
  "await",
  "return",
  "if",
  "const",
  "let",
  "var",
  "typeof",
  "instanceof",
]);

function extractIdentifiers(expr: string): string[] {
  const ids: string[] = [];
  const re = /\b([a-zA-Z_$][\w$]*)\b/g;
  let match = re.exec(expr);
  while (match) {
    const name = match[1]!;
    if (!SKIP_IDS.has(name) && !ids.includes(name)) ids.push(name);
    match = re.exec(expr);
  }
  return ids;
}

function valueEqual(a: SimValue, b: SimValue): boolean {
  return a.display === b.display && a.kind === b.kind;
}

function readsFromScope(
  names: string[],
  scope: Map<string, SimValue>,
): { name: string; value: SimValue }[] {
  return names
    .filter((name) => scope.has(name))
    .map((name) => ({ name, value: scope.get(name)! }));
}

function parseBinding(
  line: string,
): { name: string; expression: string } | null {
  const decl = DECL_RE.exec(line);
  if (decl) return { name: decl[1]!, expression: decl[2]! };
  const assign = ASSIGN_RE.exec(line);
  if (assign) return { name: assign[1]!, expression: assign[2]! };
  return null;
}

function conditionExpr(line: string): string | null {
  const match = IF_RE.exec(line.trim());
  return match?.[1]?.trim() ?? null;
}

function callToken(line: string): string | null {
  const match = CALL_RE.exec(line.trim());
  return match?.[1] ?? null;
}

function scopeBeforeLine(
  code: string,
  lineNumber: number,
  inputs: Record<string, string>,
  paramNames: string[],
): Map<string, SimValue> {
  if (lineNumber <= 1) {
    const scope = new Map<string, SimValue>();
    for (const name of paramNames) {
      scope.set(
        name,
        inputs[name] != null
          ? { display: inputs[name]!, kind: "literal" as const }
          : { display: "?", kind: "unknown" as const },
      );
    }
    return scope;
  }
  return scopeAtStep(code, lineNumber - 1, inputs, paramNames);
}

export function buildStepDetail(
  code: string,
  lineNumber: number,
  text: string,
  kind: SimStatementKind,
  inputs: Record<string, string>,
  paramNames: string[] = extractParamNames(""),
): SimStepDetail {
  const trimmed = text.trim();
  const before = scopeBeforeLine(code, lineNumber, inputs, paramNames);
  const after = scopeAtStep(code, lineNumber, inputs, paramNames);
  const notes: SimDiagnostic[] = [];
  const reads: { name: string; value: SimValue }[] = [];
  const writes: { name: string; before: SimValue; after: SimValue }[] = [];
  const calculated: { name: string; expression: string; result: SimValue }[] = [];
  let flow: SimStepDetail["flow"];

  const binding = parseBinding(trimmed);
  if (binding) {
    const readNames = extractIdentifiers(binding.expression);
    reads.push(...readsFromScope(readNames, before));
    const result = after.get(binding.name)!;
    calculated.push({
      name: binding.name,
      expression: binding.expression,
      result,
    });
    const prev = before.get(binding.name);
    if (prev && !valueEqual(prev, result)) {
      writes.push({ name: binding.name, before: prev, after: result });
    } else if (!prev) {
      writes.push({
        name: binding.name,
        before: { display: "?", kind: "unknown" },
        after: result,
      });
    }
  }

  if (kind === "if") {
    const cond = conditionExpr(trimmed);
    if (cond) reads.push(...readsFromScope(extractIdentifiers(cond), before));
    notes.push({
      severity: "info",
      code: "static.condition",
      message: "Condition is not evaluated in static walk — branch is not taken automatically.",
    });
  }

  if (kind === "await") {
    const inner = trimmed.replace(/^await\s+/, "").replace(/;$/, "");
    reads.push(...readsFromScope(extractIdentifiers(inner), before));
    notes.push({
      severity: "warn",
      code: "static.await",
      message: "Await result is unevaluated in static walk.",
    });
  }

  if (kind === "call") {
    const argSlice = trimmed.match(/\(([^)]*)\)/)?.[1] ?? "";
    reads.push(...readsFromScope(extractIdentifiers(argSlice), before));
    const token = callToken(trimmed);
    flow = { kind: "call", targetLabel: token ?? undefined };
    notes.push({
      severity: "info",
      code: "static.call",
      message: "Call return value is not computed in static walk.",
    });
  }

  if (kind === "return") {
    const expr = RETURN_RE.exec(trimmed)?.[1];
    if (expr) reads.push(...readsFromScope(extractIdentifiers(expr), before));
    flow = { kind: "return" };
  }

  if (kind === "other" && !binding) {
    reads.push(...readsFromScope(extractIdentifiers(trimmed), before));
  }

  return {
    reads,
    writes,
    calculated,
    flow,
    notes,
  };
}
