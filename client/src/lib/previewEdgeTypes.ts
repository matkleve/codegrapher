import type { SemanticTokenKind } from "@/lib/tokenColors";

export type AnchorRef =
  | { type: "element"; el: HTMLElement; side?: "left" | "right" }
  | { type: "handle"; handle: string };

/** Re-resolved each frame while a trace is active (see docs/connections.md). */
export type LiveAnchorHint = {
  token: string;
  flowNodeId: string;
  memberId?: string;
  lineNumber?: number;
  role: "usage" | "definition";
};

export type PreviewEdgeSpec = {
  id: string;
  from: AnchorRef;
  to: AnchorRef;
  kind: SemanticTokenKind;
  liveFrom?: LiveAnchorHint;
  liveTo?: LiveAnchorHint;
  /** Off-graph definition — dashed load stub + pill beside usage token. */
  load?: {
    filePath: string;
    line: number;
    occurrenceCount: number;
  };
};

export function anchorHandle(ref: AnchorRef): string | null {
  return ref.type === "handle" ? ref.handle : null;
}
