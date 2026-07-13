import { useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import {
  buildParamDefPreviewEdges,
  paramUsageCount,
} from "@/lib/paramDefPreviewEdges";
import type { LexicalGraph } from "@/lib/lexicalGraph";
import {
  paramDefForName,
  type MemberSymbolIndex,
} from "@/lib/localSymbolLinks";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeSigParamDefKey } from "@/lib/traceKeys";

type MemberSignatureParamChipProps = {
  paramName: string;
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  symbolIndex: MemberSymbolIndex;
  lexicalGraph: LexicalGraph;
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
  lexicalGraph,
  shimmerDelay,
}: MemberSignatureParamChipProps) {
  const chipRef = useRef<TokenChipHandle>(null);
  const { getNode } = useReactFlow();
  const { lookup, hasSymbol, symbols } = useIndex();
  const { beginTrace, emitWireSignal, graphData } = useGraphInteraction();

  const paramDef = paramDefForName(symbolIndex, memberId, paramName);
  const paramLine = paramDef?.lineNumber ?? 1;
  const tokenKey = makeSigParamDefKey(flowNodeId, memberId, paramName);
  const enabled = Boolean(paramDef);

  const buildEdges = useCallback(() => {
    if (!paramDef) return [];
    const chipEl = chipRef.current?.getChipElement();
    if (!chipEl) return [];
    return buildParamDefPreviewEdges(
      paramName,
      paramDef.defId,
      chipEl,
      symbolIndex,
      flowNodeId,
      memberId,
      getNode,
      symbols,
      graphData,
      hasSymbol,
      lexicalGraph,
    );
  }, [
    flowNodeId,
    getNode,
    graphData,
    hasSymbol,
    lexicalGraph,
    memberId,
    paramDef,
    paramName,
    symbolIndex,
    symbols,
  ]);

  const signalPreview = useCallback(() => {
    const edges = buildEdges();
    if (edges.length === 0) return;
    emitWireSignal(tokenKey, edges);
  }, [buildEdges, emitWireSignal, tokenKey]);

  const firePreview = useCallback(() => {
    const edges = buildEdges();
    if (edges.length === 0) return;
    beginTrace(tokenKey, edges);
  }, [beginTrace, buildEdges, tokenKey]);

  const buildPinInfo = useCallback(
    () =>
      makeTokenInfo({
        token: paramName,
        kind: "variable",
        connectionCount: paramDef ? paramUsageCount(lexicalGraph, paramDef.defId) : 0,
        projectConnectionCount: paramDef ? paramUsageCount(lexicalGraph, paramDef.defId) : 0,
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
      lexicalGraph,
      paramDef,
      paramLine,
      paramName,
      symbolIndex,
    ],
  );

  const { onEnter, onLeave, onFocus, onBlur } = useTokenHover({
    tokenKey,
    enabled,
    onFire: firePreview,
    onSignal: signalPreview,
    onClear: () => {},
    traceHost: () => chipRef.current?.getChipElement() ?? null,
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
        onFocus={onFocus}
        onBlur={onBlur}
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
