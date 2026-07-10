import type { SymbolKind } from "@/types";

/** Highlight / edge colors for token UI. */
export type SemanticTokenKind = "class" | "function" | "type" | "variable";

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
    case "property":
      return "variable";
  }
}

/** Resting text color per token type. */
export const TOKEN_TEXT: Record<SemanticTokenKind, string> = {
  function: "text-[color:var(--token-edge-function)]",
  class: "text-[color:var(--token-edge-class)]",
  type: "text-[color:var(--token-edge-type)]",
  variable: "text-[color:var(--token-edge-variable)]",
};

/** Active chip border + anchor fill. */
export const TOKEN_BORDER: Record<SemanticTokenKind, string> = {
  function:
    "border-[color:color-mix(in_oklch,var(--token-edge-function)_55%,var(--border))] dark:border-[color:color-mix(in_oklch,var(--token-edge-function)_50%,var(--border))]",
  class: "border-[color:var(--token-edge-class)]",
  type: "border-[color:var(--token-edge-type)]",
  variable: "border-[color:var(--token-edge-variable)]",
};

/** Active chip background (Ctrl held). */
export const TOKEN_BG: Record<SemanticTokenKind, string> = {
  function: "bg-[color:color-mix(in_oklch,var(--token-edge-function)_10%,transparent)]",
  class: "bg-[color:color-mix(in_oklch,var(--token-edge-class)_10%,transparent)]",
  type: "bg-[color:color-mix(in_oklch,var(--token-edge-type)_10%,transparent)]",
  variable: "bg-[color:color-mix(in_oklch,var(--token-edge-variable)_10%,transparent)]",
};

export const TOKEN_ANCHOR: Record<SemanticTokenKind, string> = {
  function:
    "bg-[color:var(--token-edge-function)] text-[color:var(--token-edge-function)]",
  class: "bg-[color:var(--token-edge-class)] text-[color:var(--token-edge-class)]",
  type: "bg-[color:var(--token-edge-type)] text-[color:var(--token-edge-type)]",
  variable:
    "bg-[color:var(--token-edge-variable)] text-[color:var(--token-edge-variable)]",
};

/** Preview edge strokes — theme-aware via CSS variables (see index.css). */
export const TOKEN_EDGE_STROKE: Record<SemanticTokenKind, string> = {
  function: "var(--token-edge-function)",
  class: "var(--token-edge-class)",
  type: "var(--token-edge-type)",
  variable: "var(--token-edge-variable)",
};

/** @deprecated Use TOKEN_BORDER + TOKEN_BG */
export const TOKEN_PILL: Record<SemanticTokenKind, string> = {
  class:
    "border-[color:var(--token-edge-class)] bg-[color:color-mix(in_oklch,var(--token-edge-class)_10%,transparent)] text-[color:var(--token-edge-class)]",
  function:
    "border-[color:color-mix(in_oklch,var(--token-edge-function)_55%,var(--border))] bg-[color:color-mix(in_oklch,var(--token-edge-function)_10%,transparent)] text-[color:var(--token-edge-function)]",
  type:
    "border-[color:var(--token-edge-type)] bg-[color:color-mix(in_oklch,var(--token-edge-type)_10%,transparent)] text-[color:var(--token-edge-type)]",
  variable:
    "border-[color:var(--token-edge-variable)] bg-[color:color-mix(in_oklch,var(--token-edge-variable)_10%,transparent)] text-[color:var(--token-edge-variable)]",
};
