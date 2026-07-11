import { tokenizeLine, type CodeToken } from "@/lib/tokenizeLine";

export type ControlFlowGroupKind = "switch" | "if";
export type ControlFlowRole = "head" | "branch" | "condition";

export type ControlFlowBranch = {
  lineNumber: number;
  tokenIndex: number;
  label: string;
};

export type ControlFlowGroup = {
  id: string;
  kind: ControlFlowGroupKind;
  headLine: number;
  headTokenIndex: number;
  branches: ControlFlowBranch[];
};

export type ControlFlowAnchor = {
  groupId: string;
  role: ControlFlowRole;
  /** Populated for `condition` anchors — the identifier token text. */
  token?: string;
};

export type ControlFlowIndex = {
  groups: Map<string, ControlFlowGroup>;
  anchors: Map<string, ControlFlowAnchor>;
};

type SigToken = { t: CodeToken; i: number };
type OpenGroup = ControlFlowGroup & { bodyDepth: number };

function significant(tokens: CodeToken[]): SigToken[] {
  return tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.kind !== "whitespace" && t.kind !== "comment");
}

/** `case 'city'` / `default` label text, stopping before the trailing `:` or `{`. */
function caseLabel(sig: SigToken[], startJ: number): string {
  const parts: string[] = [];
  for (let j = startJ; j < sig.length; j++) {
    const text = sig[j]!.t.text;
    if (text === ":" || text === "{") break;
    parts.push(text);
  }
  return parts.join(" ").trim();
}

/**
 * Identifier anchors inside the head line's `(...)` — lets hovering the
 * discriminant/condition (e.g. `field` in `switch (field)`) also fan out to
 * every branch, not just hovering the `switch`/`if` keyword itself.
 * Single-line headers only — a condition spanning multiple lines is a known
 * limitation (see connection-taxonomy.md § Control flow).
 */
function recordConditionAnchors(
  sig: SigToken[],
  startJ: number,
  lineNumber: number,
  groupId: string,
  anchors: Map<string, ControlFlowAnchor>,
): void {
  let paren = 0;
  let started = false;
  for (let j = startJ; j < sig.length; j++) {
    const { t, i } = sig[j]!;
    if (t.text === "(") {
      paren++;
      started = true;
      continue;
    }
    if (t.text === ")") {
      paren--;
      if (started && paren === 0) return;
      continue;
    }
    if (started && paren >= 1 && t.kind === "identifier") {
      anchors.set(`${lineNumber}:${i}`, { groupId, role: "condition", token: t.text });
    }
  }
}

function closeGroupIfDone(
  stack: OpenGroup[],
  depthBeforeClose: number,
  sig: SigToken[],
  j: number,
): void {
  const top = stack[stack.length - 1];
  if (!top || depthBeforeClose !== top.bodyDepth) return;

  if (top.kind === "if") {
    const next = sig[j + 1];
    if (next && next.t.text === "else") return;
  }
  stack.pop();
}

/** Opens a new switch/if group at the current line unless this `if` is an `else if` continuation. */
function openGroupIfHead(
  sig: SigToken[],
  j: number,
  lineNumber: number,
  depth: number,
  groupSeq: number,
  memberId: string,
  groups: Map<string, ControlFlowGroup>,
  anchors: Map<string, ControlFlowAnchor>,
  stack: OpenGroup[],
): boolean {
  const { t, i } = sig[j]!;
  if (t.text !== "switch" && t.text !== "if") return false;
  if (t.text === "if") {
    const prev = sig[j - 1];
    if (prev && prev.t.text === "else") return false;
  }

  const id = `cf-${memberId}-${groupSeq}`;
  const group: OpenGroup = {
    id,
    kind: t.text === "switch" ? "switch" : "if",
    headLine: lineNumber,
    headTokenIndex: i,
    branches: [],
    bodyDepth: depth + 1,
  };
  groups.set(id, group);
  anchors.set(`${lineNumber}:${i}`, { groupId: id, role: "head" });
  recordConditionAnchors(sig, j + 1, lineNumber, id, anchors);
  stack.push(group);
  return true;
}

/**
 * Naive line-scanning switch/if-chain detector — mirrors the pragmatic,
 * token-based style of `localSymbolLinks.ts` (no full AST parse). Ternary
 * chains (`cond ? a : b`) are a documented follow-up, not yet indexed here —
 * see connection-taxonomy.md § Control flow.
 */
/**
 * `startLine` is the 1-based file line of `code`'s first line. Keys MUST be
 * file-absolute — see the matching note on `buildMemberSymbolIndex`.
 */
export function buildControlFlowIndex(
  memberId: string,
  code: string,
  startLine = 1,
): ControlFlowIndex {
  const groups = new Map<string, ControlFlowGroup>();
  const anchors = new Map<string, ControlFlowAnchor>();
  const stack: OpenGroup[] = [];
  const lines = code.split("\n");
  let depth = 0;
  let groupSeq = 0;
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNumber = startLine + lineIdx;
    const line = lines[lineIdx] ?? "";
    const tokenized = tokenizeLine(line, inBlockComment);
    inBlockComment = tokenized.inBlockComment;
    const sig = significant(tokenized.tokens);

    for (let j = 0; j < sig.length; j++) {
      const { t, i } = sig[j]!;

      if (t.text === "{") {
        depth++;
        continue;
      }

      if (t.text === "}") {
        const depthBeforeClose = depth;
        depth--;
        closeGroupIfDone(stack, depthBeforeClose, sig, j);
        continue;
      }

      if (t.text === "switch" || t.text === "if") {
        if (openGroupIfHead(sig, j, lineNumber, depth, groupSeq, memberId, groups, anchors, stack)) {
          groupSeq++;
        }
        continue;
      }

      if (t.text === "else") {
        const top = stack[stack.length - 1];
        if (top && top.kind === "if" && depth === top.bodyDepth - 1) {
          const next = sig[j + 1];
          const label = next && next.t.text === "if" ? "else if" : "else";
          top.branches.push({ lineNumber, tokenIndex: i, label });
          anchors.set(`${lineNumber}:${i}`, { groupId: top.id, role: "branch" });
        }
        continue;
      }

      if (t.text === "case" || t.text === "default") {
        const top = stack[stack.length - 1];
        if (top && top.kind === "switch" && depth === top.bodyDepth) {
          top.branches.push({ lineNumber, tokenIndex: i, label: caseLabel(sig, j) });
          anchors.set(`${lineNumber}:${i}`, { groupId: top.id, role: "branch" });
        }
        continue;
      }
    }
  }

  return { groups, anchors };
}

export function controlFlowAnchorFor(
  index: ControlFlowIndex,
  lineNumber: number,
  tokenIndex: number,
): ControlFlowAnchor | undefined {
  return index.anchors.get(`${lineNumber}:${tokenIndex}`);
}

export function controlFlowGroup(
  index: ControlFlowIndex,
  groupId: string,
): ControlFlowGroup | undefined {
  return index.groups.get(groupId);
}
