import { commitTokenPin } from "@/hooks/useTokenTrace";
import { ControlFlowChip } from "@/components/code/ControlFlowChip";
import type { CodeLineTokenRenderProps } from "@/components/code/codeLineTokenTypes";
import { makeControlFlowKey } from "@/lib/traceKeys";
import type { CodeToken } from "@/lib/tokenizeLine";

type Props = CodeLineTokenRenderProps & {
  token: CodeToken;
  cfRole: "head" | "branch";
};

export function CodeLineControlFlowToken({
  lineNumber,
  memberId,
  sourceFlowId,
  token,
  tokenIndex,
  cfRole,
  controller,
}: Props) {
  const {
    chipRefs,
    clearHover,
    fireCfFromRef,
    signalCfFromRef,
    fireControlFlowPreview,
    buildControlFlowPinInfo,
    scheduleHoverFire,
    scheduleHoverClear,
    pinTrace,
    showTokenInfo,
  } = controller;

  const cfKey = makeControlFlowKey(sourceFlowId, memberId, lineNumber, tokenIndex);
  const cfRefKey = `${lineNumber}-${tokenIndex}`;

  return (
    <ControlFlowChip
      key={`${lineNumber}-${tokenIndex}`}
      ref={(handle) => {
        if (handle) chipRefs.current.set(cfRefKey, handle);
        else chipRefs.current.delete(cfRefKey);
      }}
      text={token.text}
      traceKey={cfKey}
      cfRole={cfRole}
      shimmerDelay={`-${((lineNumber * 7 + tokenIndex) * 0.37).toFixed(2)}s`}
      onMouseEnter={() =>
        scheduleHoverFire(
          cfKey,
          () => fireCfFromRef(lineNumber, tokenIndex, cfRefKey),
          clearHover,
          undefined,
          { onSignal: () => signalCfFromRef(lineNumber, tokenIndex, cfRefKey) },
        )
      }
      onMouseLeave={() => scheduleHoverClear(cfKey, clearHover)}
      onFocus={() =>
        scheduleHoverFire(
          cfKey,
          () => fireCfFromRef(lineNumber, tokenIndex, cfRefKey),
          clearHover,
          undefined,
          {
            instant: true,
            onSignal: () => signalCfFromRef(lineNumber, tokenIndex, cfRefKey),
          },
        )
      }
      onBlur={() => scheduleHoverClear(cfKey, clearHover)}
      onClick={(e) => {
        e.stopPropagation();
        const chipEl = chipRefs.current.get(cfRefKey)?.getChipElement();
        if (!chipEl) return;
        commitTokenPin({
          pinTrace,
          showTokenInfo,
          tokenKey: cfKey,
          onFire: () => fireControlFlowPreview(lineNumber, tokenIndex, chipEl),
          buildPinInfo: () =>
            buildControlFlowPinInfo(
              token.text,
              cfRole === "head" ? "definition" : "usage",
              lineNumber,
            ),
          animateEl: chipEl,
          event: e,
          shiftKey: e.shiftKey,
        });
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const chip = chipRefs.current.get(cfRefKey);
        const chipEl = chip?.getChipElement();
        if (!chipEl) return;
        commitTokenPin({
          pinTrace,
          showTokenInfo,
          tokenKey: cfKey,
          onFire: () => fireControlFlowPreview(lineNumber, tokenIndex, chipEl),
          buildPinInfo: () =>
            buildControlFlowPinInfo(
              token.text,
              cfRole === "head" ? "definition" : "usage",
              lineNumber,
            ),
          animateEl: chipEl,
        });
      }}
    />
  );
}
