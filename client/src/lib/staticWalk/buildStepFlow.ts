import type { CodeToken } from "@/lib/tokenizeLine";
import { parseArithmeticExpr, type ExprNode } from "@/lib/staticWalk/flowExprParser";
import type { SimValue } from "@/lib/staticWalk/types";

/**
 * Per-statement expression flow graph — drives C3's flow points + substep
 * stepping. See docs/specs/system/execution-simulator.canvas-values.supplement.md,
 * "Expression flow graph" and "Substep model". An empty array signals an
 * undecomposable RHS: the caller falls back to the C-alt shimmer model.
 */
export type FlowAnchor = { line: number; tokenIndex: number };

export type FlowSubstep = {
  kind: "fetch" | "combine" | "assign" | "bind";
  source: FlowAnchor[];
  target: FlowAnchor;
  value?: SimValue;
};

export type FlowBinding = {
  name: string;
  expression: string;
};

const UNKNOWN_VALUE: SimValue = { display: "?", kind: "unknown" };

function anchor(line: number, tokenIndex: number): FlowAnchor {
  return { line, tokenIndex };
}

function findEqTokenIndex(tokens: CodeToken[], lhsTokenIndex: number): number | null {
  for (let i = lhsTokenIndex + 1; i < tokens.length; i++) {
    if (tokens[i]!.text === "=") return i;
  }
  return null;
}

function findLhsTokenIndex(tokens: CodeToken[], name: string): number | null {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "identifier" && t.text === name) return i;
  }
  return null;
}

function leafValue(leaf: ExprNode & { type: "leaf" }, reads: { name: string; value: SimValue }[]): SimValue {
  if (leaf.kind === "identifier") {
    return reads.find((r) => r.name === leaf.text)?.value ?? UNKNOWN_VALUE;
  }
  return { display: leaf.text, kind: "literal" };
}

function computeArithmetic(op: string, left: number, right: number): number | null {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? null : left / right;
    case "%":
      return right === 0 ? null : left % right;
    default:
      return null;
  }
}

function combineValue(op: string, left: SimValue, right: SimValue): SimValue {
  if (left.kind === "literal" && right.kind === "literal") {
    const l = Number(left.display);
    const r = Number(right.display);
    if (Number.isFinite(l) && Number.isFinite(r)) {
      const result = computeArithmetic(op, l, r);
      if (result != null) return { display: String(result), kind: "literal" };
    }
  }
  return { display: `${left.display} ${op} ${right.display}`, kind: "unevaluated" };
}

function resultAnchorOf(node: ExprNode, line: number): FlowAnchor {
  return node.type === "leaf" ? anchor(line, node.tokenIndex) : anchor(line, node.opTokenIndex);
}

/** Postorder walk emitting one `combine` substep per operator, innermost-first. */
function collectCombines(
  node: ExprNode,
  line: number,
  reads: { name: string; value: SimValue }[],
  out: FlowSubstep[],
): SimValue {
  if (node.type === "leaf") return leafValue(node, reads);

  const leftValue = collectCombines(node.left, line, reads, out);
  const rightValue = collectCombines(node.right, line, reads, out);
  const value = combineValue(node.op, leftValue, rightValue);
  out.push({
    kind: "combine",
    source: [resultAnchorOf(node.left, line), resultAnchorOf(node.right, line)],
    target: anchor(line, node.opTokenIndex),
    value,
  });
  return value;
}

function collectLeaves(node: ExprNode, acc: (ExprNode & { type: "leaf" })[]): void {
  if (node.type === "leaf") {
    acc.push(node);
    return;
  }
  collectLeaves(node.left, acc);
  collectLeaves(node.right, acc);
}

/**
 * Build the ordered `FlowSubstep[]` for one binding statement
 * (`const A = B * C;` / `A = B * C;`). Returns `[]` when there is no binding
 * or the RHS is undecomposable — callers use an empty result as the trigger
 * for the C-alt shimmer fallback (see the supplement's "Undecomposable RHS").
 */
export function buildStepFlow(
  lineNumber: number,
  tokens: CodeToken[],
  binding: FlowBinding | null,
  reads: { name: string; value: SimValue }[],
): FlowSubstep[] {
  if (!binding) return [];

  const lhsTokenIndex = findLhsTokenIndex(tokens, binding.name);
  if (lhsTokenIndex == null) return [];
  const eqTokenIndex = findEqTokenIndex(tokens, lhsTokenIndex);
  if (eqTokenIndex == null) return [];

  const root = parseArithmeticExpr(tokens, eqTokenIndex + 1);
  if (!root) return [];

  const leaves: (ExprNode & { type: "leaf" })[] = [];
  collectLeaves(root, leaves);
  const fetchSubsteps: FlowSubstep[] = leaves.map((leaf) => ({
    kind: "fetch",
    source: [],
    target: anchor(lineNumber, leaf.tokenIndex),
    value: leafValue(leaf, reads),
  }));

  const combineSubsteps: FlowSubstep[] = [];
  const rootValue = collectCombines(root, lineNumber, reads, combineSubsteps);

  const assignSubstep: FlowSubstep = {
    kind: "assign",
    source: [resultAnchorOf(root, lineNumber)],
    target: anchor(lineNumber, eqTokenIndex),
    value: rootValue,
  };
  const bindSubstep: FlowSubstep = {
    kind: "bind",
    source: [anchor(lineNumber, eqTokenIndex)],
    target: anchor(lineNumber, lhsTokenIndex),
    value: rootValue,
  };

  return [...fetchSubsteps, ...combineSubsteps, assignSubstep, bindSubstep];
}
