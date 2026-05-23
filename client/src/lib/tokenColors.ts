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

/** Resting text color per token type. */
export const TOKEN_TEXT: Record<SemanticTokenKind, string> = {
  function: "text-blue-400",
  class: "text-yellow-400",
  type: "text-green-400",
};

/** Active chip border + anchor fill. */
export const TOKEN_BORDER: Record<SemanticTokenKind, string> = {
  function: "border-blue-400",
  class: "border-yellow-400",
  type: "border-green-400",
};

/** Active chip background (Ctrl held). */
export const TOKEN_BG: Record<SemanticTokenKind, string> = {
  function: "bg-blue-400/15",
  class: "bg-yellow-400/15",
  type: "bg-green-400/15",
};

export const TOKEN_ANCHOR: Record<SemanticTokenKind, string> = {
  function: "bg-blue-400",
  class: "bg-yellow-400",
  type: "bg-green-400",
};

/** Preview edge strokes — aligned with token hues. */
export const TOKEN_EDGE_STROKE: Record<SemanticTokenKind, string> = {
  function: "#60a5fa",
  class: "#facc15",
  type: "#4ade80",
};

/** @deprecated Use TOKEN_TEXT */
export const TOKEN_HIGHLIGHT: Record<SemanticTokenKind, string> = TOKEN_TEXT;

/** @deprecated Use TOKEN_BORDER + TOKEN_BG */
export const TOKEN_PILL: Record<SemanticTokenKind, string> = {
  class: "border-yellow-400 bg-yellow-400/10 text-yellow-400",
  function: "border-blue-400 bg-blue-400/10 text-blue-400",
  type: "border-green-400 bg-green-400/10 text-green-400",
};
