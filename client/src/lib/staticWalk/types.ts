export type SimValueKind = "literal" | "unevaluated" | "unknown";

export type SimValue = {
  display: string;
  kind: SimValueKind;
};

export type SimStatementKind =
  | "declaration"
  | "assignment"
  | "call"
  | "return"
  | "if"
  | "await"
  | "other";

export type SimStep = {
  lineNumber: number;
  text: string;
  kind: SimStatementKind;
  scopeSnapshot: Map<string, SimValue>;
  edgePulse?: { fromLine: number; toMemberId?: string; token?: string };
};

export type SimSession = {
  flowNodeId: string;
  memberId: string;
  methodName: string;
  startLine: number;
  endLine: number;
  inputs: Record<string, string>;
  steps: SimStep[];
  currentIndex: number;
};

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;
