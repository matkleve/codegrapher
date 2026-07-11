import { buildStepList } from "@/lib/staticWalk/buildStepList";
import type { SimValue, SimValueKind } from "@/lib/staticWalk/types";

const DECL_RE = /^(?:const|let|var)\s+(\w+)\s*=\s*(.+);$/;
const ASSIGN_RE = /^(\w+)\s*=\s*(.+);$/;
const PARAM_RE = /^\s*(?:public|private|protected|readonly)?\s*(\w+)\s*:/;

function displayValue(raw: string, kind: SimValueKind = "literal"): SimValue {
  return { display: raw.trim(), kind };
}

function parseInitializer(expr: string, inputs: Record<string, string>): SimValue {
  const trimmed = expr.trim();
  if (trimmed === "undefined") return { display: "undefined", kind: "unknown" };
  if (trimmed.startsWith("await ")) {
    return { display: trimmed.replace(/^await\s+/, ""), kind: "unevaluated" };
  }
  if (trimmed in inputs) return displayValue(inputs[trimmed]!);
  if (/^["'`]/.test(trimmed) || /^-?\d/.test(trimmed) || trimmed === "true" || trimmed === "false") {
    return displayValue(trimmed);
  }
  if (/^this\.\w+/.test(trimmed)) return displayValue(trimmed, "unevaluated");
  if (/^\w+$/.test(trimmed) && trimmed in inputs) return displayValue(inputs[trimmed]!);
  return displayValue(trimmed, "unevaluated");
}

export function scopeAtStep(
  code: string,
  stepIndex: number,
  inputs: Record<string, string>,
  paramNames: string[] = [],
): Map<string, SimValue> {
  const steps = buildStepList(code);
  const scope = new Map<string, SimValue>();

  for (const name of paramNames) {
    scope.set(name, inputs[name] != null ? displayValue(inputs[name]!) : { display: "?", kind: "unknown" });
  }

  for (let i = 0; i <= stepIndex && i < steps.length; i++) {
    const line = steps[i]!.text.trim();
    const decl = DECL_RE.exec(line);
    if (decl) {
      scope.set(decl[1]!, parseInitializer(decl[2]!, inputs));
      continue;
    }
    const assign = ASSIGN_RE.exec(line);
    if (assign) {
      scope.set(assign[1]!, parseInitializer(assign[2]!, inputs));
    }
  }

  return scope;
}

export function extractParamNames(signatureLine: string): string[] {
  const match = signatureLine.match(/\(([^)]*)\)/);
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((p) => PARAM_RE.exec(p)?.[1])
    .filter((n): n is string => Boolean(n));
}
