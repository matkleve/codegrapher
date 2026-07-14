import { useCallback, useMemo } from "react";
import { useGraphActions } from "@/context/GraphInteractionContext";
import { commitTokenPin } from "@/hooks/useTokenTrace";
import { useTokenContextMenu } from "@/hooks/useTokenContextMenu";
import { makeMemberDefKey, makeUsageTokenKey, tokenIndexFromChipKey } from "@/lib/traceKeys";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import type { CodeLineProps } from "@/components/code/codeLineTypes";
import type { IndexContextValue } from "@/context/IndexContext";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import { useCodeLineUsagePinInfo } from "@/components/code/useCodeLineUsagePinInfo";

type IdentifierHandlersArgs = Pick<
  CodeLineProps,
  | "filePath"
  | "definedInLabel"
  | "lineNumber"
  | "memberId"
  | "sourceFlowId"
  | "sourceGraphNodeId"
  | "methodCode"
  | "methodName"
  | "signatureLine"
  | "methodStartLine"
> & {
  chipRefs: React.RefObject<Map<string, TokenChipHandle>>;
  defEdgeContext: DefinitionEdgeContext;
  clearHover: () => void;
  firePreview: (name: string, chipKey: string, chipEl: HTMLElement) => void;
  signalPreview: (name: string, chipKey: string, chipEl: HTMLElement) => void;
  fireDefPreview: (name: string, chipEl: HTMLElement) => void;
  signalDefPreview: (name: string, chipEl: HTMLElement) => void;
  hasSymbol: (name: string) => boolean;
  lookup: IndexContextValue["lookup"];
};

export function useCodeLineIdentifierHandlers(args: IdentifierHandlersArgs) {
  const {
    filePath,
    lineNumber,
    memberId,
    sourceFlowId,
    methodCode,
    methodName,
    signatureLine,
    methodStartLine,
    chipRefs,
    defEdgeContext,
    clearHover,
    firePreview,
    fireDefPreview,
    signalPreview,
    signalDefPreview,
    hasSymbol,
    lookup,
  } = args;

  const {
    scheduleHoverFire,
    scheduleHoverClear,
    pinTrace,
    showTokenInfo,
  } = useGraphActions();

  const defTokenKey = useMemo(
    () => makeMemberDefKey(sourceFlowId, memberId),
    [memberId, sourceFlowId],
  );

  const buildUsagePinInfo = useCodeLineUsagePinInfo({
    lookup,
    hasSymbol,
    defEdgeContext,
    definedInLabel: args.definedInLabel,
    filePath,
    lineNumber,
    sourceFlowId,
    sourceGraphNodeId: args.sourceGraphNodeId,
  });

  const openContextMenu = useTokenContextMenu({
    filePath,
    sourceFlowId,
    sourceMemberId: memberId,
    simulation:
      methodCode && methodName && signatureLine && methodStartLine != null
        ? { methodName, code: methodCode, signatureLine, methodStartLine }
        : undefined,
  });

  const onIdentifierEnter = useCallback(
    (
      name: string,
      chipKey: string,
      isDefinition: boolean,
      memberFanOut: boolean,
      instant = false,
    ) => {
      const chip = chipRefs.current.get(chipKey);
      const chipEl = chip?.getChipElement();
      if (!chipEl) return;
      const tokenIndex = tokenIndexFromChipKey(chipKey);
      const tokenKey = memberFanOut
        ? defTokenKey
        : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, tokenIndex, name);
      scheduleHoverFire(
        tokenKey,
        () =>
          memberFanOut
            ? fireDefPreview(name, chipEl)
            : firePreview(name, chipKey, chipEl),
        clearHover,
        () =>
          showTokenInfo({
            ...buildUsagePinInfo(name, chipEl, isDefinition),
            pinned: false,
          }),
        {
          ...(instant ? { instant: true } : {}),
          traceHost: chipEl,
          onSignal: () =>
            memberFanOut
              ? signalDefPreview(name, chipEl)
              : signalPreview(name, chipKey, chipEl),
        },
      );
    },
    [
      buildUsagePinInfo,
      chipRefs,
      clearHover,
      defTokenKey,
      fireDefPreview,
      firePreview,
      lineNumber,
      memberId,
      scheduleHoverFire,
      showTokenInfo,
      signalDefPreview,
      signalPreview,
      sourceFlowId,
    ],
  );

  const onIdentifierLeave = useCallback(
    (name: string, chipKey: string, memberFanOut: boolean) => {
      const tokenIndex = tokenIndexFromChipKey(chipKey);
      const tokenKey = memberFanOut
        ? defTokenKey
        : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, tokenIndex, name);
      scheduleHoverClear(tokenKey, clearHover);
    },
    [clearHover, defTokenKey, lineNumber, memberId, scheduleHoverClear, sourceFlowId],
  );

  const onIdentifierFocus = useCallback(
    (name: string, chipKey: string, isDefinition: boolean, memberFanOut: boolean) => {
      onIdentifierEnter(name, chipKey, isDefinition, memberFanOut, true);
    },
    [onIdentifierEnter],
  );

  const onIdentifierBlur = onIdentifierLeave;

  const onIdentifierClick = useCallback(
    (
      name: string,
      chipKey: string,
      el: HTMLElement,
      isDefinition: boolean,
      memberFanOut: boolean,
      e?: React.MouseEvent,
    ) => {
      const tokenIndex = tokenIndexFromChipKey(chipKey);
      const tokenKey = memberFanOut
        ? defTokenKey
        : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, tokenIndex, name);
      commitTokenPin({
        pinTrace,
        showTokenInfo,
        tokenKey,
        onFire: () =>
          memberFanOut
            ? fireDefPreview(name, el)
            : firePreview(name, chipKey, el),
        buildPinInfo: () => buildUsagePinInfo(name, el, isDefinition),
        animateEl: el,
        event: e,
        shiftKey: e?.shiftKey,
      });
    },
    [
      buildUsagePinInfo,
      defTokenKey,
      fireDefPreview,
      firePreview,
      lineNumber,
      memberId,
      pinTrace,
      showTokenInfo,
      sourceFlowId,
    ],
  );

  return {
    defTokenKey,
    buildUsagePinInfo,
    openContextMenu,
    onIdentifierEnter,
    onIdentifierLeave,
    onIdentifierFocus,
    onIdentifierBlur,
    onIdentifierClick,
  };
}
