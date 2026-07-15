import { commitTokenPin } from "@/hooks/useTokenTrace";
import { TokenChip } from "@/components/code/TokenChip";
import type { CodeLineTokenRenderProps } from "@/components/code/codeLineTokenTypes";
import { makeImportSpecKey } from "@/lib/traceKeys";
import { resolveClientImportPath } from "@/lib/resolveImportPath";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import type { CodeToken } from "@/lib/tokenizeLine";

type Props = CodeLineTokenRenderProps & {
  token: CodeToken;
};

export function CodeLineImportToken({
  lineNumber,
  memberId,
  sourceFlowId,
  sourceGraphNodeId,
  filePath,
  definedInLabel,
  token,
  tokenIndex,
  controller,
}: Props) {
  const {
    chipRefs,
    clearHover,
    fireImportPreview,
    signalImportPreview,
    scheduleHoverFire,
    scheduleHoverClear,
    pinTrace,
    showTokenInfo,
  } = controller;

  const chipKey = `import-${lineNumber}-${tokenIndex}`;
  const tokenKey = makeImportSpecKey(sourceFlowId, memberId, lineNumber, token.text);

  return (
    <TokenChip
      key={`${lineNumber}-${tokenIndex}`}
      ref={(handle) => {
        if (handle) chipRefs.current.set(chipKey, handle);
        else chipRefs.current.delete(chipKey);
      }}
      text={token.text}
      semantic="type"
      traceKey={tokenKey}
      interactive
      symbolRole="usage"
      shimmerDelay={`-${((lineNumber * 7 + tokenIndex) * 0.37).toFixed(2)}s`}
      role="button"
      tabIndex={0}
      onMouseEnter={() => {
        const chip = chipRefs.current.get(chipKey);
        const chipEl = chip?.getChipElement();
        if (!chipEl) return;
        scheduleHoverFire(
          tokenKey,
          () => fireImportPreview(token.text, chipEl),
          clearHover,
          undefined,
          {
            traceHost: chipEl,
            onSignal: () => signalImportPreview(token.text, chipEl),
          },
        );
      }}
      onMouseLeave={() => scheduleHoverClear(tokenKey, clearHover)}
      onFocus={() => {
        const chip = chipRefs.current.get(chipKey);
        const chipEl = chip?.getChipElement();
        if (!chipEl) return;
        scheduleHoverFire(
          tokenKey,
          () => fireImportPreview(token.text, chipEl),
          clearHover,
          undefined,
          { instant: true, onSignal: () => signalImportPreview(token.text, chipEl) },
        );
      }}
      onBlur={() => scheduleHoverClear(tokenKey, clearHover)}
      onClick={(e) => {
        e.stopPropagation();
        const chipEl = chipRefs.current.get(chipKey)?.getChipElement();
        if (!chipEl) return;
        commitTokenPin({
          pinTrace,
          showTokenInfo,
          tokenKey,
          onFire: () => fireImportPreview(token.text, chipEl),
          buildPinInfo: () =>
            makeTokenInfo({
              token: token.text.replace(/^['"]|['"]$/g, ""),
              kind: "type",
              connectionCount: 0,
              projectConnectionCount: 0,
              definedIn: definedInLabel,
              filePath: resolveClientImportPath(filePath, token.text),
              line: lineNumber,
              sourceFlowId,
              sourceGraphNodeId,
              role: "usage",
              pinned: true,
            }),
          animateEl: chipEl,
          event: e,
          shiftKey: e.shiftKey,
        });
      }}
    />
  );
}
