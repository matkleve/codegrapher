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
  function: "text-blue-600 dark:text-blue-400",
  class: "text-yellow-600 dark:text-yellow-400",
  type: "text-green-600 dark:text-green-400",
};

/** Active chip border + anchor fill. */
export const TOKEN_BORDER: Record<SemanticTokenKind, string> = {
  function: "border-blue-500 dark:border-blue-400",
  class: "border-yellow-500 dark:border-yellow-400",
  type: "border-green-500 dark:border-green-400",
};

/** Active chip background (Ctrl held). */
export const TOKEN_BG: Record<SemanticTokenKind, string> = {
  function: "bg-blue-500/10 dark:bg-blue-400/15",
  class: "bg-yellow-500/10 dark:bg-yellow-400/15",
  type: "bg-green-500/10 dark:bg-green-400/15",
};

export const TOKEN_ANCHOR: Record<SemanticTokenKind, string> = {
  function: "bg-blue-500 dark:bg-blue-400",
  class: "bg-yellow-500 dark:bg-yellow-400",
  type: "bg-green-500 dark:bg-green-400",
};

/** Preview edge strokes — theme-aware via CSS variables (see index.css). */
export const TOKEN_EDGE_STROKE: Record<SemanticTokenKind, string> = {
  function: "var(--token-edge-function)",
  class: "var(--token-edge-class)",
  type: "var(--token-edge-type)",
};

/** @deprecated Use TOKEN_BORDER + TOKEN_BG */
export const TOKEN_PILL: Record<SemanticTokenKind, string> = {
  class:
    "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:border-yellow-400 dark:bg-yellow-400/10 dark:text-yellow-400",
  function:
    "border-blue-500 bg-blue-500/10 text-blue-600 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-400",
  type: "border-green-500 bg-green-500/10 text-green-600 dark:border-green-400 dark:bg-green-400/10 dark:text-green-400",
};
