import type { CodeToken } from "@/lib/tokenizeLine";

/**
 * Walks left from a property-access identifier through `a.b.c` chains,
 * returning the token index of every receiver segment, nearest first.
 *
 * `country` in `context.country` → `[indexOf("context")]`. `context` itself
 * (not preceded by `.`) → `[]` — cascading only ever flows from a property
 * access back toward its receiver, never the other direction (hovering the
 * receiver alone must not light up things reached *through* it).
 */
export function memberAccessReceiverIndices(
  tokens: CodeToken[],
  tokenIndex: number,
): number[] {
  const receivers: number[] = [];
  let cursor = tokenIndex;

  for (;;) {
    let dotIdx = cursor - 1;
    while (dotIdx >= 0 && tokens[dotIdx]?.kind === "whitespace") dotIdx--;
    if (dotIdx < 0 || tokens[dotIdx]?.text !== ".") break;

    let identIdx = dotIdx - 1;
    while (identIdx >= 0 && tokens[identIdx]?.kind === "whitespace") identIdx--;
    if (identIdx < 0 || tokens[identIdx]?.kind !== "identifier") break;

    receivers.push(identIdx);
    cursor = identIdx;
  }

  return receivers;
}
