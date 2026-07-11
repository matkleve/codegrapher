import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { ExternalReferenceCard } from "@/lib/resolveVisibleTarget";

/** Preview overlay connection kind — distinct from structural taxonomy edges. */
export type PreviewConnectionKind = "usage" | "binding" | "branch" | "transitive";

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
  /** Stable host id — signature tags and other non-line keys. */
  traceKey?: string;
};

export type PreviewEdgeSpec = {
  id: string;
  from: AnchorRef;
  to: AnchorRef;
  kind: SemanticTokenKind;
  /** Defaults to usage when omitted. */
  connectionKind?: PreviewConnectionKind;
  liveFrom?: LiveAnchorHint;
  liveTo?: LiveAnchorHint;
  /** Transitive hop distance (2+); decays opacity on wire. */
  hop?: number;
  opacity?: number;
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
