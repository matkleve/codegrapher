import { buildStepList } from "@/lib/staticWalk/buildStepList";
import { buildStepDetail } from "@/lib/staticWalk/buildStepDetail";
import { extractParamNames, scopeAtStep } from "@/lib/staticWalk/scopeAtStep";
import type { SimSession } from "@/lib/staticWalk/types";
import type { SimAnchor } from "@/context/simulationTypes";

export function buildSession(
  anchor: SimAnchor,
  inputs: Record<string, string>,
  endLine: number,
): SimSession {
  // The static-walk engine works in *code-relative* line numbers (1 = first
  // line of `code`), but the gutter, CodeLine, and preview handles use
  // *file-absolute* lines. Convert at this boundary: feed code-relative lines
  // to the engine, emit file-absolute lines to the UI. `methodStartLine` is the
  // file line of `code`'s first line, so file = rel + base - 1.
  const base = anchor.methodStartLine;
  const toRel = (fileLine: number): number => fileLine - base + 1;
  const toFile = (relLine: number): number => relLine + base - 1;

  const parsed = buildStepList(anchor.code, toRel(anchor.startLine), toRel(endLine));
  const paramNames = extractParamNames(anchor.signatureLine);
  const steps: SimSession["steps"] = parsed.map((stmt) => ({
    lineNumber: toFile(stmt.lineNumber),
    text: stmt.text,
    kind: stmt.kind,
    scopeSnapshot: scopeAtStep(anchor.code, stmt.lineNumber, inputs, paramNames),
    detail: buildStepDetail(
      anchor.code,
      stmt.lineNumber,
      stmt.text,
      stmt.kind,
      inputs,
      paramNames,
    ),
    edgePulse:
      stmt.kind === "call" || stmt.kind === "return"
        ? { fromLine: toFile(stmt.lineNumber), token: stmt.text.match(/(\w+)\s*\(/)?.[1] }
        : undefined,
  }));

  return {
    flowNodeId: anchor.flowNodeId,
    memberId: anchor.memberId,
    methodName: anchor.methodName,
    filePath: anchor.filePath,
    startLine: anchor.startLine,
    endLine,
    inputs,
    steps,
    currentIndex: 0,
  };
}

export function initPreflightInputs(
  signatureLine: string,
  prev: Record<string, string>,
): Record<string, string> {
  const params = extractParamNames(signatureLine);
  const next = { ...prev };
  for (const p of params) {
    if (!(p in next)) next[p] = "";
  }
  return next;
}
