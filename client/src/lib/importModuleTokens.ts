import type { CodeToken } from "@/lib/tokenizeLine";

/** True when a string token is a relative module path in an import declaration. */
export function isImportModuleSpecifier(
  tokens: CodeToken[],
  index: number,
): boolean {
  const tok = tokens[index];
  if (tok?.kind !== "string") return false;
  const spec = tok.text.replace(/^['"]|['"]$/g, "");
  if (!spec.startsWith(".")) return false;

  for (let j = index - 1; j >= 0; j--) {
    const t = tokens[j];
    if (!t || t.kind === "whitespace") continue;
    if (t.kind === "keyword" && (t.text === "import" || t.text === "from")) {
      return true;
    }
    if (t.text === ";") break;
  }
  return false;
}
