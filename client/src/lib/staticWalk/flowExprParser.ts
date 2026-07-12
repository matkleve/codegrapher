import type { CodeToken } from "@/lib/tokenizeLine";

/**
 * Minimal arithmetic-expression parser over an already-tokenized line, used
 * only to decompose a binding's RHS into an operator tree for the expression
 * flow graph (see docs/specs/system/execution-simulator.canvas-values.supplement.md,
 * "Expression flow graph"). Deliberately narrow: identifiers, numbers,
 * strings, `+ - * / %`, and grouping parens only. Anything else (calls,
 * template interpolation, ternaries, member access, deep nesting) fails to
 * parse — the caller treats a parse failure as "undecomposable" and falls
 * back to the C-alt shimmer model instead of guessing at precedence.
 */

export type ExprLeaf = {
  type: "leaf";
  tokenIndex: number;
  text: string;
  kind: "identifier" | "number" | "string";
};

export type ExprBinop = {
  type: "binop";
  op: string;
  opTokenIndex: number;
  left: ExprNode;
  right: ExprNode;
};

export type ExprNode = ExprLeaf | ExprBinop;

/** RHS parse depth beyond this many nested parens is deemed undecomposable. */
const MAX_NESTING_DEPTH = 2;
const ADDITIVE_OPS = new Set(["+", "-"]);
const MULTIPLICATIVE_OPS = new Set(["*", "/", "%"]);

type NonWsToken = { idx: number; text: string; kind: CodeToken["kind"] };
type Cursor = { pos: number };
type DepthState = { depth: number; maxDepth: number };

function toNonWs(tokens: CodeToken[], fromIndex: number): NonWsToken[] {
  const out: NonWsToken[] = [];
  for (let i = fromIndex; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "whitespace") continue;
    if (t.text === ";") break;
    out.push({ idx: i, text: t.text, kind: t.kind });
  }
  return out;
}

function parsePrimary(
  toks: NonWsToken[],
  cursor: Cursor,
  depth: DepthState,
): ExprNode | null {
  const t = toks[cursor.pos];
  if (!t) return null;

  if (t.text === "(") {
    depth.depth += 1;
    depth.maxDepth = Math.max(depth.maxDepth, depth.depth);
    cursor.pos += 1;
    const inner = parseAdditive(toks, cursor, depth);
    if (!inner) return null;
    const close = toks[cursor.pos];
    if (close?.text !== ")") return null;
    cursor.pos += 1;
    depth.depth -= 1;
    return inner;
  }

  if (t.kind === "identifier") {
    // A call (`foo(...)`) is undecomposable in this pass — its result
    // depends on the transport/call-substep pipeline, not local arithmetic.
    if (toks[cursor.pos + 1]?.text === "(") return null;
    cursor.pos += 1;
    return { type: "leaf", tokenIndex: t.idx, text: t.text, kind: "identifier" };
  }

  if (t.kind === "number") {
    cursor.pos += 1;
    return { type: "leaf", tokenIndex: t.idx, text: t.text, kind: "number" };
  }

  if (t.kind === "string") {
    // Template interpolation (`${...}`) is undecomposable.
    if (t.text.includes("${")) return null;
    cursor.pos += 1;
    return { type: "leaf", tokenIndex: t.idx, text: t.text, kind: "string" };
  }

  return null;
}

function parseBinaryLevel(
  toks: NonWsToken[],
  cursor: Cursor,
  depth: DepthState,
  ops: Set<string>,
  parseOperand: (toks: NonWsToken[], cursor: Cursor, depth: DepthState) => ExprNode | null,
): ExprNode | null {
  let left = parseOperand(toks, cursor, depth);
  if (!left) return null;

  for (let t = toks[cursor.pos]; t && ops.has(t.text); t = toks[cursor.pos]) {
    const opTokenIndex = t.idx;
    const op = t.text;
    cursor.pos += 1;
    const right = parseOperand(toks, cursor, depth);
    if (!right) return null;
    left = { type: "binop", op, opTokenIndex, left, right };
  }
  return left;
}

function parseMultiplicative(
  toks: NonWsToken[],
  cursor: Cursor,
  depth: DepthState,
): ExprNode | null {
  return parseBinaryLevel(toks, cursor, depth, MULTIPLICATIVE_OPS, parsePrimary);
}

function parseAdditive(
  toks: NonWsToken[],
  cursor: Cursor,
  depth: DepthState,
): ExprNode | null {
  return parseBinaryLevel(toks, cursor, depth, ADDITIVE_OPS, parseMultiplicative);
}

/**
 * Parse the RHS tokens (starting at `fromIndex` in the line's full token
 * array) into an arithmetic operator tree. Returns `null` — "undecomposable"
 * — on any parse failure, leftover tokens, or nesting deeper than
 * `MAX_NESTING_DEPTH` (calls, ternaries, template interpolation, and
 * anything not in the `+ - * / %` grammar all surface this way).
 */
export function parseArithmeticExpr(tokens: CodeToken[], fromIndex: number): ExprNode | null {
  const toks = toNonWs(tokens, fromIndex);
  if (toks.length === 0) return null;

  const cursor: Cursor = { pos: 0 };
  const depth: DepthState = { depth: 0, maxDepth: 0 };
  const root = parseAdditive(toks, cursor, depth);
  if (!root) return null;
  if (cursor.pos !== toks.length) return null;
  if (depth.maxDepth > MAX_NESTING_DEPTH) return null;
  return root;
}
