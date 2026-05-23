import type { SymbolKind } from "@/types";

/** Highlight / edge colors for token UI. */
export type SemanticTokenKind = "class" | "function" | "type";

export type TokenKind = SemanticTokenKind | "plain";

export function symbolKindToSemantic(kind: SymbolKind): SemanticTokenKind {
  switch (kind) {
    case "interface":
    case "class":
      return "class";
    case "function":
    case "method":
      return "function";
    case "type":
      return "type";
  }
}

export const TOKEN_HIGHLIGHT: Record<SemanticTokenKind, string> = {
  class: "cursor-pointer underline text-primary",
  function: "cursor-pointer underline text-sky-300",
  type: "cursor-pointer underline text-emerald-400",
};

export const TOKEN_PILL: Record<SemanticTokenKind, string> = {
  class: "border-primary/45 bg-primary/12 text-primary",
  function: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  type: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
};

/** Preview edge strokes — aligned with theme token hues. */
export const TOKEN_EDGE_STROKE: Record<SemanticTokenKind, string> = {
  class: "var(--token-class)",
  function: "var(--token-function)",
  type: "var(--token-type)",
};
