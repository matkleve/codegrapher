import type { CodeLineTokenRenderProps } from "@/components/code/codeLineTokenTypes";
import { cn } from "@/lib/utils";
import type { CodeToken } from "@/lib/tokenizeLine";

type Props = CodeLineTokenRenderProps & {
  token: CodeToken;
  inTypeContext?: boolean;
};

export function CodeLinePlainSpan({
  lineNumber,
  token,
  tokenIndex,
  controller,
  inTypeContext,
}: Props) {
  const { simAnchorFor } = controller;

  return (
    <span
      key={`${lineNumber}-${tokenIndex}`}
      data-sim-anchor={simAnchorFor(tokenIndex)}
      className={cn(
        inTypeContext && "code-type",
        token.kind === "keyword" && "code-kw",
        (token.kind === "operator" || token.kind === "other") && "code-pn",
        token.kind === "comment" && "code-comment text-muted-foreground",
        token.kind === "string" && "code-string text-[color:var(--code-string)]",
        token.kind === "number" && "code-number text-[color:var(--code-number)]",
      )}
    >
      {token.text}
    </span>
  );
}
