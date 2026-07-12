import { useCallback, useMemo } from "react";
import { defSiteFor, usageTargetFor } from "@/lib/localSymbolLinks";
import { blockCommentOpenAtLineStart, tokenizeLine } from "@/lib/tokenizeLine";
import type { CodeToken } from "@/lib/tokenizeLine";
import { useIndex } from "@/context/IndexContext";
import type { CodeLineProps } from "@/components/code/codeLineTypes";

export function useCodeLineTokens({
  line,
  lineNumber,
  methodCode,
  symbolIndex,
}: Pick<CodeLineProps, "line" | "lineNumber" | "methodCode" | "symbolIndex">) {
  const { hasSymbol } = useIndex();

  const tokens = useMemo(() => {
    const inBlock =
      methodCode != null
        ? blockCommentOpenAtLineStart(methodCode, lineNumber)
        : false;
    return tokenizeLine(line, inBlock).tokens;
  }, [line, lineNumber, methodCode]);

  /** Does `tokens[idx]` resolve to something on its own (local/param/indexed)? */
  const isLinkableIdentifier = useCallback(
    (idx: number): boolean => {
      const tok = tokens[idx];
      if (!tok || tok.kind !== "identifier") return false;
      return (
        hasSymbol(tok.text) ||
        !!defSiteFor(symbolIndex, lineNumber, idx) ||
        !!usageTargetFor(symbolIndex, lineNumber, idx)
      );
    },
    [hasSymbol, lineNumber, symbolIndex, tokens],
  );

  return { tokens, isLinkableIdentifier } satisfies {
    tokens: CodeToken[];
    isLinkableIdentifier: (idx: number) => boolean;
  };
}
