import type { SemanticTokenKind } from "@/lib/tokenColors";

export type GraphTargetLevel = "class" | "member" | "line";

export type GraphVisibleTarget = {
  mode: "graph";
  level: GraphTargetLevel;
  flowNodeId: string;
  targetHandle: string;
  label: string;
  kind: SemanticTokenKind;
  memberId?: string;
  lineNumber?: number;
  definitionEl?: HTMLElement;
};

export type ExternalReferenceCard = {
  symbolName: string;
  filePath: string;
  line: number;
  occurrenceCount: number;
};

export type VisibleTargetResult =
  | GraphVisibleTarget
  | { mode: "external"; cards: ExternalReferenceCard[] }
  | null;
