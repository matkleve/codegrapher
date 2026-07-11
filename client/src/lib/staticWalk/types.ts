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

export type SimDiagnostic = {
  severity: "info" | "warn";
  code: string;
  message: string;
};

export type SimStepDetail = {
  reads: { name: string; value: SimValue }[];
  writes: { name: string; before: SimValue; after: SimValue }[];
  calculated: { name: string; expression: string; result: SimValue }[];
  flow?: { kind: "call" | "return"; targetLabel?: string };
  notes: SimDiagnostic[];
};

export type SimStep = {
  lineNumber: number;
  text: string;
  kind: SimStatementKind;
  scopeSnapshot: Map<string, SimValue>;
  detail: SimStepDetail;
  edgePulse?: { fromLine: number; toMemberId?: string; token?: string };
  /** Call resolves to a class node other than the session owner. */
  crossesClass?: boolean;
};

export type SimSession = {
  flowNodeId: string;
  memberId: string;
  methodName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  inputs: Record<string, string>;
  steps: SimStep[];
  currentIndex: number;
};

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export type SimPanelTab = "run" | "inputs" | "paths";
