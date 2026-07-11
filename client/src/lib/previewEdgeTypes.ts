import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { ExternalReferenceCard } from "@/lib/resolveVisibleTarget";

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
    token: string;
    filePath: string;
    line: number;
    occurrenceCount: number;
    candidates: ExternalReferenceCard[];
    /** definition = load decl file; callSite = load file containing a caller */
    direction?: "definition" | "callSite";
  };
};

export function anchorHandle(ref: AnchorRef): string | null {
  return ref.type === "handle" ? ref.handle : null;
}
