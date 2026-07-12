import { TokenChip } from "@/components/code/TokenChip";
import type { CodeLineTokenRenderProps } from "@/components/code/codeLineTokenTypes";
import { resolveLocalTargetId } from "@/lib/localDefLinks";
import { usageTargetFor } from "@/lib/localSymbolLinks";
import { semanticForCodeIdentifier } from "@/lib/tokenColors";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import {
  parseTemplateLiteralParts,
  templateInterpolationSites,
} from "@/lib/templateInterpolations";
import type { CodeToken } from "@/lib/tokenizeLine";

type Props = CodeLineTokenRenderProps & {
  token: CodeToken;
};

export function CodeLineTemplateLiteralSpan({
  line,
  lineNumber,
  memberId,
  sourceFlowId,
  symbolIndex,
  token,
  tokenIndex,
  controller,
}: Props) {
  const {
    chipRefs,
    hasSymbol,
    lookup,
    onIdentifierEnter,
    onIdentifierLeave,
    onIdentifierFocus,
    onIdentifierBlur,
    onIdentifierClick,
  } = controller;

  const parts = parseTemplateLiteralParts(token.text);
  const interpSites = templateInterpolationSites(line);
  let siteCursor = 0;

  return (
    <span
      key={`${lineNumber}-${tokenIndex}`}
      className="code-string text-[color:var(--code-string)]"
    >
      {parts.map((part, partIdx) => {
        if (part.kind === "text") {
          return <span key={`${lineNumber}-${tokenIndex}-t-${partIdx}`}>{part.text}</span>;
        }
        const site = interpSites[siteCursor++];
        const interpIndex = site?.tokenIndex ?? tokenIndex;
        const name = part.name;
        const rawTarget = usageTargetFor(symbolIndex, lineNumber, interpIndex);
        const localTargetId = rawTarget
          ? resolveLocalTargetId(rawTarget, sourceFlowId)
          : null;
        if (!localTargetId && !hasSymbol(name)) {
          return <span key={`${lineNumber}-${tokenIndex}-v-${partIdx}`}>{part.raw}</span>;
        }
        const chipKey = `${lineNumber}-${interpIndex}`;
        const tokenKey = makeUsageTokenKey(
          sourceFlowId,
          memberId,
          lineNumber,
          interpIndex,
          name,
        );
        const entry = lookup(name);
        const semantic = semanticForCodeIdentifier(entry, null);
        return (
          <TokenChip
            key={`${lineNumber}-${tokenIndex}-v-${partIdx}`}
            ref={(handle) => {
              if (handle) chipRefs.current.set(chipKey, handle);
              else chipRefs.current.delete(chipKey);
            }}
            text={name}
            semantic={semantic}
            traceKey={tokenKey}
            interactive
            localTargetId={localTargetId ?? undefined}
            symbolRole="usage"
            shimmerDelay={`-${((lineNumber * 7 + interpIndex) * 0.37).toFixed(2)}s`}
            role="button"
            tabIndex={0}
            onMouseEnter={() => onIdentifierEnter(name, chipKey, false, false)}
            onMouseLeave={() => onIdentifierLeave(name, chipKey, false)}
            onFocus={() => onIdentifierFocus(name, chipKey, false, false)}
            onBlur={() => onIdentifierBlur(name, chipKey, false)}
            onClick={(e) => {
              e.stopPropagation();
              onIdentifierClick(name, chipKey, e.currentTarget, false, false, e);
            }}
          />
        );
      })}
    </span>
  );
}
