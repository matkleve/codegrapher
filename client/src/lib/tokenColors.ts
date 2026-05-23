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
  class: "cursor-pointer underline text-yellow-400",
  function: "cursor-pointer underline text-blue-400",
  type: "cursor-pointer underline text-green-400",
};

export const TOKEN_PILL: Record<SemanticTokenKind, string> = {
  class: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
  function: "border-blue-400/40 bg-blue-400/10 text-blue-400",
  type: "border-green-400/40 bg-green-400/10 text-green-400",
};

/** Stroke colors for preview edges (Tailwind yellow/blue/green-400). */
export const TOKEN_EDGE_STROKE: Record<SemanticTokenKind, string> = {
  class: "rgb(250 204 21)",
  function: "rgb(96 165 250)",
  type: "rgb(74 222 128)",
};
