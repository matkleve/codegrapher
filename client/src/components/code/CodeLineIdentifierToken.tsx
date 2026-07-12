import { TokenChip } from "@/components/code/TokenChip";
import type { CodeLineTokenRenderProps } from "@/components/code/codeLineTokenTypes";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import { resolveLocalTargetId } from "@/lib/localDefLinks";
import {
  defSiteFor,
  memberDefId,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { isDefinitionSignatureLine } from "@/lib/resolveDefinitionUsageSites";
import { isTypeAnnotationContext, semanticForCodeIdentifier } from "@/lib/tokenColors";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import { cn } from "@/lib/utils";
import type { CodeToken } from "@/lib/tokenizeLine";

type Props = CodeLineTokenRenderProps & {
  token: CodeToken;
  prevText: string | null;
  prevPrevText: string | null;
};

export function CodeLineIdentifierToken({
  line,
  lineNumber,
  memberId,
  sourceFlowId,
  symbolIndex,
  memberSymbolName,
  token,
  tokenIndex,
  prevText,
  prevPrevText,
  controller,
}: Props) {
  const {
    tokens,
    isLinkableIdentifier,
    hasSymbol,
    lookup,
    defTokenKey,
    simTokenClass,
    simAnchorFor,
    openContextMenu,
    onIdentifierEnter,
    onIdentifierLeave,
    onIdentifierFocus,
    onIdentifierBlur,
    onIdentifierClick,
    chipRefs,
  } = controller;

  const rawLocalTarget = usageTargetFor(symbolIndex, lineNumber, tokenIndex);
  const isMemberSignatureDecl =
    memberSymbolName != null &&
    token.text === memberSymbolName &&
    isDefinitionSignatureLine(
      line,
      token.text,
      sourceFlowId,
      memberId,
      sourceFlowId,
      memberId,
    );
  const localDefId =
    defSiteFor(symbolIndex, lineNumber, tokenIndex) ??
    (isMemberSignatureDecl ? memberDefId(memberId) : undefined);
  const localTargetId =
    rawLocalTarget && !isMemberSignatureDecl
      ? resolveLocalTargetId(rawLocalTarget, sourceFlowId)
      : null;
  const indexed = hasSymbol(token.text);
  const isCascadeCandidate =
    prevText === "." &&
    memberAccessReceiverIndices(tokens, tokenIndex).some(isLinkableIdentifier);
  const interactive = indexed || !!localDefId || !!localTargetId || isCascadeCandidate;
  const inTypeContext = isTypeAnnotationContext(prevText, prevPrevText);

  if (!interactive) {
    return (
      <span key={`${lineNumber}-${tokenIndex}`} className={cn(inTypeContext && "code-type")}>
        {token.text}
      </span>
    );
  }

  const entry = lookup(token.text);
  const semantic = semanticForCodeIdentifier(entry, prevText, prevPrevText);
  const isClassDeclName =
    indexed &&
    semantic === "class" &&
    (prevText === "class" || prevText === "interface");
  const isDefinition = Boolean(localDefId || isClassDeclName || isMemberSignatureDecl);
  const memberFanOut = isClassDeclName || isMemberSignatureDecl;
  const chipKey = `${lineNumber}-${tokenIndex}`;
  const tokenKey = memberFanOut
    ? defTokenKey
    : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, tokenIndex, token.text);

  return (
    <TokenChip
      key={`${lineNumber}-${tokenIndex}`}
      ref={(handle) => {
        if (handle) chipRefs.current.set(chipKey, handle);
        else chipRefs.current.delete(chipKey);
      }}
      text={token.text}
      semantic={semantic}
      traceKey={tokenKey}
      interactive={interactive}
      className={simTokenClass(token.text)}
      localDefId={localDefId}
      localTargetId={localTargetId ?? undefined}
      simAnchor={simAnchorFor(tokenIndex)}
      symbolRole={isDefinition ? "definition" : "usage"}
      shimmerDelay={`-${((lineNumber * 7 + tokenIndex) * 0.37).toFixed(2)}s`}
      role="button"
      tabIndex={0}
      onMouseEnter={() =>
        onIdentifierEnter(token.text, chipKey, isDefinition, memberFanOut)
      }
      onMouseLeave={() => onIdentifierLeave(token.text, chipKey, memberFanOut)}
      onFocus={() => onIdentifierFocus(token.text, chipKey, isDefinition, memberFanOut)}
      onBlur={() => onIdentifierBlur(token.text, chipKey, memberFanOut)}
      onClick={(e) => {
        e.stopPropagation();
        onIdentifierClick(token.text, chipKey, e.currentTarget, isDefinition, memberFanOut, e);
      }}
      onContextMenu={(e) => {
        openContextMenu(e, {
          token: token.text,
          kind: semantic,
          role: isDefinition ? "definition" : "usage",
          chipEl: e.currentTarget,
          editorLine: lineNumber,
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onIdentifierClick(token.text, chipKey, e.currentTarget, isDefinition, memberFanOut);
        }
      }}
    />
  );
}
