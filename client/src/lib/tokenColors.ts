export type ResolvableTokenKind = "function" | "variable" | "class";

export type TokenKind = ResolvableTokenKind | "unknown" | "plain";

export const TOKEN_HIGHLIGHT: Record<ResolvableTokenKind, string> = {
  function: "cursor-pointer underline text-blue-400",
  variable: "cursor-pointer underline text-green-400",
  class: "cursor-pointer underline text-yellow-400",
};

export const TOKEN_PILL: Record<ResolvableTokenKind, string> = {
  function: "border-blue-400/40 bg-blue-400/10 text-blue-400",
  variable: "border-green-400/40 bg-green-400/10 text-green-400",
  class: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
};

/** Stroke colors for preview edges (Tailwind blue/green/yellow-400). */
export const TOKEN_EDGE_STROKE: Record<ResolvableTokenKind, string> = {
  function: "rgb(96 165 250)",
  variable: "rgb(74 222 128)",
  class: "rgb(250 204 21)",
};
