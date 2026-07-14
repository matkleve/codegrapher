import { memo, useCallback, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { MemberRowBody } from "@/components/nodes/MemberRowBody";
import { MemberRowHeader } from "@/components/nodes/MemberRowHeader";
import { useGraphActions } from "@/context/GraphInteractionContext";
import { useDefinitionTrace } from "@/hooks/useDefinitionTrace";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useIndex } from "@/context/IndexContext";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import { buildMemberSymbolIndex, memberDefId } from "@/lib/localSymbolLinks";
import { buildLexicalGraph } from "@/lib/lexicalGraph";
import { buildControlFlowIndex } from "@/lib/controlFlowLinks";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeMemberDefKey } from "@/lib/traceKeys";
import { parseMethodSignature } from "@/lib/parseMethodSignature";
import { findMethodOverride } from "@/lib/overrideInfo";
import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { cn } from "@/lib/utils";

type CollapsibleMemberRowProps = {
  memberId: string;
  label: string;
  symbolName?: string;
  code: string;
  startLine: number;
  showSignatureTags?: boolean;
  expanded: boolean;
  onToggle: (memberId: string) => void;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  isReadingFocus?: boolean;
};

function CollapsibleMemberRowComponent({
  memberId,
  label,
  symbolName,
  code,
  startLine,
  showSignatureTags = false,
  expanded,
  onToggle,
  flowNodeId,
  graphNodeId,
  filePath,
  classLabel,
  isReadingFocus = false,
}: CollapsibleMemberRowProps) {
  const lines = code.split("\n");
  const memberHandleId = previewMemberHandle(memberId);
  const labelRef = useRef<HTMLSpanElement>(null);
  const memberRowRef = useRef<HTMLDivElement>(null);
  useTraceHostRegistration(labelRef);
  useTraceHostRegistration(memberRowRef);
  const { lookup, hasSymbol, symbols } = useIndex();
  const {
    beginTrace,
    graphData,
    lookupIndexedUsageSites,
    lookupProjectReferences,
    lookupOffCanvasCallSiteFiles,
    cancelHoverLeaveGrace,
    selectReadingFocus,
  } = useGraphActions();
  const { getNode } = useReactFlow();

  const traceName = symbolName ?? label;
  const defTokenKey = makeMemberDefKey(flowNodeId, memberId);
  const localDefId = memberDefId(memberId);
  const entry = lookup(traceName);
  const defKind = entry ? symbolKindToSemantic(entry.kind) : symbolName ? "function" : null;
  const traceable = hasSymbol(traceName) || Boolean(symbolName);
  const signatureLine =
    code.split("\n").find((l) => l.trim().length > 0) ?? label;

  const symbolIndex = useMemo(
    () => buildMemberSymbolIndex(memberId, code, startLine),
    [memberId, code, startLine],
  );
  const lexicalGraph = useMemo(
    () => buildLexicalGraph(symbolIndex, code, startLine),
    [symbolIndex, code, startLine],
  );
  const controlFlowIndex = useMemo(
    () => buildControlFlowIndex(memberId, code, startLine),
    [memberId, code, startLine],
  );
  const methodSignature = useMemo(
    () => (showSignatureTags ? parseMethodSignature(code) : null),
    [code, showSignatureTags],
  );
  const overrideInfo = useMemo(
    () =>
      symbolName && graphData
        ? findMethodOverride(graphData, graphNodeId, symbolName)
        : null,
    [graphData, graphNodeId, symbolName],
  );

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId: flowNodeId,
      sourceMemberId: memberId,
      lookupIndexedUsageSites,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
    }),
    [
      flowNodeId,
      getNode,
      graphData,
      lookupIndexedUsageSites,
      lookupOffCanvasCallSiteFiles,
      lookupProjectReferences,
      memberId,
    ],
  );

  const defTrace = useDefinitionTrace({
    anchorRef: labelRef,
    tokenKey: defTokenKey,
    traceName,
    defKind,
    enabled: traceable,
    defEdgeContext,
    filePath,
    definedIn: classLabel,
    line: startLine,
    flowNodeId,
    graphNodeId,
    editorLine: startLine,
    sourceMemberId: memberId,
    simulation: { methodName: traceName, code, signatureLine, methodStartLine: startLine },
    traceHost: () => labelRef.current,
  });

  const onOverrideClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!labelRef.current || !overrideInfo) return;
      const parentMethod = graphData?.nodes.find(
        (n) =>
          n.type === "method" &&
          n.parent === overrideInfo.parentGraphNodeId &&
          n.label === overrideInfo.methodName,
      );
      if (!parentMethod) return;
      const target = resolveVisibleTarget(
        overrideInfo.methodName,
        symbols,
        graphData,
        getNode,
        flowNodeId,
      );
      if (!target || target.mode !== "graph") return;
      beginTrace(
        defTokenKey,
        [buildUsagePreviewEdge(`override-${memberId}`, target, labelRef.current, traceName)],
      );
    },
    [
      beginTrace,
      defTokenKey,
      flowNodeId,
      getNode,
      graphData,
      memberId,
      overrideInfo,
      symbols,
      traceName,
    ],
  );

  const onReadingFocusDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      cancelHoverLeaveGrace();
      selectReadingFocus({ flowNodeId, memberId });
    },
    [cancelHoverLeaveGrace, flowNodeId, memberId, selectReadingFocus],
  );

  return (
    <div
      ref={memberRowRef}
      data-member-id={memberId}
      className={cn(
        "member-row nodrag relative overflow-visible rounded-md bg-muted",
        isReadingFocus && "member-row--reading-focus",
      )}
      onDoubleClick={onReadingFocusDoubleClick}
    >
      <MemberRowHeader
        memberId={memberId}
        traceName={traceName}
        traceable={traceable}
        defTokenKey={defTokenKey}
        localDefId={localDefId}
        defKind={defKind}
        expanded={expanded}
        labelRef={labelRef}
        memberHandleId={memberHandleId}
        methodSignature={methodSignature}
        overrideInfo={overrideInfo}
        flowNodeId={flowNodeId}
        graphNodeId={graphNodeId}
        filePath={filePath}
        classLabel={classLabel}
        symbolIndex={symbolIndex}
        lexicalGraph={lexicalGraph}
        code={code}
        startLine={startLine}
        onToggle={onToggle}
        onCancelHoverLeaveGrace={cancelHoverLeaveGrace}
        onOverrideClick={onOverrideClick}
        onEnter={defTrace.onEnter}
        onLeave={defTrace.onLeave}
        onFocus={defTrace.onFocus}
        onBlur={defTrace.onBlur}
        onContextMenu={defTrace.onContextMenu}
        onPinClick={defTrace.onPinClick}
      />
      {expanded && code.trim() ? (
        <MemberRowBody
          memberId={memberId}
          lines={lines}
          startLine={startLine}
          flowNodeId={flowNodeId}
          graphNodeId={graphNodeId}
          filePath={filePath}
          classLabel={classLabel}
          symbolIndex={symbolIndex}
          lexicalGraph={lexicalGraph}
          controlFlowIndex={controlFlowIndex}
          symbolName={symbolName}
          code={code}
          traceName={traceName}
          signatureLine={signatureLine}
        />
      ) : null}
    </div>
  );
}

export const CollapsibleMemberRow = memo(CollapsibleMemberRowComponent);
