import type { SymbolKind } from "@/types";

/** Highlight / edge colors for token UI. */
export type SemanticTokenKind = "class" | "function" | "type" | "variable";

export type TokenKind = SemanticTokenKind | "plain";

export function symbolKindToSemantic(kind: SymbolKind): SemanticTokenKind {
  switch (kind) {
    case "interface":
    case "type":
      return "type";
    case "class":
      return "class";
    case "function":
    case "method":
      return "function";
    case "property":
    case "param":
    case "local":
      return "variable";
  }
}

const TYPE_CONTEXT_PREV = new Set([
  ":",
  "<",
  "extends",
  "implements",
  "?",
  "instanceof",
]);

/** Type annotations and generic bounds use blue `type` ink, not purple `class`. */
export function isTypeAnnotationContext(prevText: string | null): boolean {
  return TYPE_CONTEXT_PREV.has(prevText ?? "");
}

export function semanticForCodeIdentifier(
  entry: { kind: SymbolKind } | undefined,
  prevText: string | null,
): SemanticTokenKind {
  const base = entry ? symbolKindToSemantic(entry.kind) : "variable";
  if (isTypeAnnotationContext(prevText) && base !== "function") {
    return "type";
  }
  return base;
}

/** Read the semantic kind rendered on a chip (data-token-kind). */
export function semanticFromChipElement(
  chipEl: HTMLElement,
  entry: { kind: SymbolKind } | undefined,
): SemanticTokenKind {
  const kind = chipEl.dataset.tokenKind;
  if (kind === "class" || kind === "function" || kind === "type" || kind === "variable") {
    return kind;
  }
  return entry ? symbolKindToSemantic(entry.kind) : "variable";
}

/** Flow-anchor fill classes — chip ink/borders live in tokens-chips.css via data-token-kind. */
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
