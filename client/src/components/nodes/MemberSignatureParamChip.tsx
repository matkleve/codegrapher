import { useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import {
  buildParamDefPreviewEdges,
  paramUsageCount,
} from "@/lib/linksForElement";
import {
  paramDefForName,
  type MemberSymbolIndex,
} from "@/lib/localSymbolLinks";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeUsageTokenKey } from "@/lib/traceKeys";

type MemberSignatureParamChipProps = {
  paramName: string;
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  symbolIndex: MemberSymbolIndex;
  shimmerDelay: string;
};

export function MemberSignatureParamChip({
  paramName,
  memberId,
  flowNodeId,
  graphNodeId,
  filePath,
  classLabel,
  symbolIndex,
  shimmerDelay,
}: MemberSignatureParamChipProps) {
  const chipRef = useRef<TokenChipHandle>(null);
  const { getNode } = useReactFlow();
  const { beginTrace } = useGraphInteraction();

  const paramDef = paramDefForName(symbolIndex, memberId, paramName);
  const paramLine = paramDef?.lineNumber ?? 1;
  const tokenKey = makeUsageTokenKey(flowNodeId, memberId, paramLine, paramName);
  const enabled = Boolean(paramDef);

  const firePreview = useCallback(() => {
    if (!paramDef) return;
    const chipEl = chipRef.current?.getChipElement();
    if (!chipEl) return;
    beginTrace(
      tokenKey,
      buildParamDefPreviewEdges(
        paramName,
        paramDef.defId,
        chipEl,
        symbolIndex,
        flowNodeId,
        memberId,
        getNode,
      ),
    );
  }, [
    beginTrace,
    flowNodeId,
    getNode,
    memberId,
    paramDef,
    paramName,
    symbolIndex,
    tokenKey,
  ]);

  const buildPinInfo = useCallback(
    () =>
      makeTokenInfo({
        token: paramName,
        kind: "variable",
        connectionCount: paramDef ? paramUsageCount(symbolIndex, paramDef.defId) : 0,
        definedIn: classLabel,
        filePath,
        line: paramLine,
        sourceFlowId: flowNodeId,
        sourceGraphNodeId: graphNodeId,
        role: "definition",
        pinned: true,
      }),
    [
      classLabel,
      filePath,
      flowNodeId,
      graphNodeId,
      paramDef,
      paramLine,
      paramName,
      symbolIndex,
    ],
  );

  const { onEnter, onLeave } = useTokenHover({
    tokenKey,
    enabled,
    onFire: firePreview,
    onClear: () => {},
    buildTransientInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  const { onPinClick } = useTokenPin({
    tokenKey,
    enabled,
    onFire: firePreview,
    buildPinInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  if (!enabled) {
    return <span className="member-sig-param-name">{paramName}</span>;
  }

  return (
    <span
      className="member-sig-param-chip nodrag shrink-0"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TokenChip
        ref={chipRef}
        text={paramName}
        semantic="variable"
        traceKey={tokenKey}
        interactive
        localDefId={paramDef!.defId}
        symbolRole="definition"
        shimmerDelay={shimmerDelay}
        role="button"
        tabIndex={0}
        className="member-sig-token-chip"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          onPinClick(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            onPinClick(e as unknown as React.MouseEvent);
          }
        }}
      />
    </span>
  );
}
