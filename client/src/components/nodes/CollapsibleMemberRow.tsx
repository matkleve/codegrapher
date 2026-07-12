import { useCallback, useMemo, useRef } from "react";
import { MemberSignatureTags } from "@/components/nodes/MemberSignatureTags";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { CodeLine } from "@/components/code/CodeLine";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useIndex } from "@/context/IndexContext";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
import { buildDefinitionPreviewEdges } from "@/lib/buildDefinitionPreviewEdges";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import { connectionCountsForHost } from "@/lib/connectionCounts";
import {
  buildMemberSymbolIndex,
  memberDefId,
} from "@/lib/localSymbolLinks";
import { buildLexicalGraph } from "@/lib/lexicalGraph";
import { buildControlFlowIndex } from "@/lib/controlFlowLinks";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeMemberDefKey } from "@/lib/traceKeys";
import {
  buildHoverLoadMenu,
  loadTargetsFromCallSiteRefs,
} from "@/lib/connectionMenu";
import { useTokenContextMenu } from "@/hooks/useTokenContextMenu";
import { parseMethodSignature } from "@/lib/parseMethodSignature";
import { findMethodOverride } from "@/lib/overrideInfo";
import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapsibleMemberRowProps = {
  memberId: string;
  label: string;
  symbolName?: string;
  code: string;
  /** 1-based line in the source file where `code`'s first line lives. */
  startLine: number;
  /** When true, show parsed param/return tags in the row header. */
  showSignatureTags?: boolean;
  expanded: boolean;
  onToggle: (memberId: string) => void;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  isReadingFocus?: boolean;
};

export function CollapsibleMemberRow({
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
    isHandleActive,
    edgeKindAtHandle,
    beginTrace,
    graphData,
    lookupIndexedUsageSites,
    lookupProjectReferences,
    lookupOffCanvasCallSiteFiles,
    cancelHoverLeaveGrace,
    focusReadingMember,
    showConnectionMenu,
    clearConnectionMenu,
  } = useGraphInteraction();
  const { getNode } = useReactFlow();

  const traceName = symbolName ?? label;
  const defTokenKey = makeMemberDefKey(flowNodeId, memberId);
  const localDefId = memberDefId(memberId);
  const entry = lookup(traceName);
  const defKind = entry ? symbolKindToSemantic(entry.kind) : symbolName ? "function" : null;
  const traceable = hasSymbol(traceName) || Boolean(symbolName);
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
  // The parser can prefix a method's `code` with blank/trivia lines, so the
  // first non-blank line is the real signature. A blank signatureLine gates out
  // SimGutterControl and breaks param extraction (extractParamNames).
  const signatureLine =
    code.split("\n").find((l) => l.trim().length > 0) ?? label;
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

  const fireDefPreview = useCallback(() => {
    if (!traceable || !labelRef.current || !defKind) return;
    beginTrace(
      defTokenKey,
      buildDefinitionPreviewEdges(
        traceName,
        defKind,
        labelRef.current,
        defEdgeContext,
      ),
    );
    const sites = lookupOffCanvasCallSiteFiles(traceName);
    const menuState = buildHoverLoadMenu(
      traceName,
      defKind,
      "definition",
      labelRef.current,
      loadTargetsFromCallSiteRefs(traceName, sites),
      filePath,
    );
    if (menuState) showConnectionMenu(menuState);
    else clearConnectionMenu();
  }, [
    beginTrace,
    clearConnectionMenu,
    defEdgeContext,
    defKind,
    defTokenKey,
    filePath,
    lookupOffCanvasCallSiteFiles,
    showConnectionMenu,
    traceName,
    traceable,
  ]);

  const buildDefPinInfo = useCallback(
    () => {
      const counts = connectionCountsForHost(
        labelRef.current!,
        traceName,
        defEdgeContext,
      );
      return makeTokenInfo({
        token: traceName,
        kind: defKind!,
        connectionCount: counts.onCanvas,
        projectConnectionCount: counts.inProject,
        definedIn: classLabel,
        filePath,
        line: startLine,
        sourceFlowId: flowNodeId,
        sourceGraphNodeId: graphNodeId,
        role: "definition",
        pinned: true,
      });
    },
    [
      classLabel,
      defEdgeContext,
      defKind,
      filePath,
      flowNodeId,
      graphNodeId,
      startLine,
      traceName,
    ],
  );

  const { onEnter: onDefEnter, onLeave: onDefLeave, onFocus: onDefFocus, onBlur: onDefBlur } = useTokenHover({
    tokenKey: defTokenKey,
    enabled: traceable,
    onFire: fireDefPreview,
    onClear: () => {},
    traceHost: () => labelRef.current,
    buildTransientInfo: () => {
      const info = buildDefPinInfo();
      const { pinned: _p, ...rest } = info;
      return rest;
    },
  });

  const { onPinClick: onDefClick } = useTokenPin({
    tokenKey: defTokenKey,
    enabled: traceable && Boolean(defKind),
    onFire: fireDefPreview,
    animateEl: undefined,
    buildPinInfo: () => {
      const { pinned: _p, ...rest } = buildDefPinInfo();
      return rest;
    },
  });

  const targetActive = isHandleActive(memberHandleId);
  const memberKind = edgeKindAtHandle(memberHandleId);

  const openContextMenu = useTokenContextMenu({
    filePath,
    sourceFlowId: flowNodeId,
    sourceMemberId: memberId,
    simulation: { methodName: traceName, code, signatureLine, methodStartLine: startLine },
  });

  const onDefContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!traceable || !labelRef.current || !defKind) return;
      openContextMenu(e, {
        token: traceName,
        kind: defKind,
        role: "definition",
        chipEl: labelRef.current,
        editorLine: startLine,
      });
    },
    [defKind, openContextMenu, startLine, traceName, traceable],
  );

  const onReadingFocusDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      cancelHoverLeaveGrace();
      focusReadingMember(flowNodeId, memberId);
    },
    [cancelHoverLeaveGrace, focusReadingMember, flowNodeId, memberId],
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
      <Handle
        type="target"
        position={Position.Left}
        id={memberHandleId}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <FlowAnchor
        side="left"
        targetId={memberHandleId}
        size="node"
        visible={targetActive}
        highlighted={targetActive}
        colorClass={targetActive && memberKind ? TOKEN_ANCHOR[memberKind] : "bg-border"}
      />
      <button
        type="button"
        className={cn(
          "member-row-header hoverable",
          "flex w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 border border-transparent px-2 py-1.5 text-left",
          expanded ? "member-row-header--expanded" : "member-row-header--collapsed",
        )}
        aria-expanded={expanded}
        onPointerDown={(e) => {
          e.stopPropagation();
          cancelHoverLeaveGrace();
        }}
        onClick={(e) => {
          e.stopPropagation();
          cancelHoverLeaveGrace();
          onToggle(memberId);
        }}
      >
        <ExpandChevron
          expanded={expanded}
          headerHoverPreview
          className="member-row-caret shrink-0 text-muted-foreground"
        />
        <span
          ref={labelRef}
          data-symbol-name={traceable ? traceName : undefined}
          data-symbol-role={traceable ? "definition" : undefined}
          data-trace-key={traceable ? defTokenKey : undefined}
          data-local-def-id={traceable ? localDefId : undefined}
          data-token-kind={traceable ? defKind ?? undefined : undefined}
          className={cn(
            "member-row-label nodrag relative inline-block w-fit max-w-full text-[length:var(--font-size-sm)] font-medium text-foreground",
            traceable && "token-def-label cursor-pointer",
          )}
          role={traceable ? "button" : undefined}
          tabIndex={traceable ? 0 : undefined}
          style={
            traceable
              ? ({ "--shimmer-delay": `-${(memberId.length * 0.37).toFixed(2)}s` } as React.CSSProperties)
              : undefined
          }
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={onDefEnter}
          onMouseLeave={onDefLeave}
          onFocus={onDefFocus}
          onBlur={onDefBlur}
          onContextMenu={onDefContextMenu}
          onClick={onDefClick}
          onKeyDown={
            traceable
              ? (e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onDefClick(e as unknown as React.MouseEvent);
                  }
                }
              : undefined
          }
        >
          {traceable && defKind ? (
            <>
              <FlowAnchor
                side="left"
                colorClass="bg-border"
                visible={false}
                highlighted={false}
                size="chip"
              />
              <FlowAnchor
                side="right"
                colorClass="bg-border"
                visible={false}
                highlighted={false}
                size="chip"
              />
            </>
          ) : null}
          <span className="token-shimmer-target" data-text={traceName}>
            {traceName}
          </span>
        </span>
        {methodSignature ? (
          <MemberSignatureTags
            signature={methodSignature}
            memberId={memberId}
            flowNodeId={flowNodeId}
            graphNodeId={graphNodeId}
            filePath={filePath}
            classLabel={classLabel}
            symbolIndex={symbolIndex}
            lexicalGraph={lexicalGraph}
            methodCode={code}
            methodStartLine={startLine}
          />
        ) : null}
        {overrideInfo ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="text-2xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              if (!labelRef.current) return;
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
            }}
          >
            ↑ overrides {overrideInfo.parentClass}.{overrideInfo.methodName}
          </Button>
        ) : null}
      </button>
      {expanded && code.trim() ? (
        <div className="member-body-wrap nodrag overflow-visible px-2 pb-2 pl-5 pt-1.5 text-muted-foreground">
          <div className="flex flex-col gap-0.5">
            {lines.map((line, i) => (
              <CodeLine
                key={`${memberId}-${i}`}
                line={line}
                lineNumber={startLine + i}
                memberId={memberId}
                sourceFlowId={flowNodeId}
                sourceGraphNodeId={graphNodeId}
                filePath={filePath}
                definedInLabel={classLabel}
                symbolIndex={symbolIndex}
                lexicalGraph={lexicalGraph}
                controlFlowIndex={controlFlowIndex}
                memberSymbolName={symbolName}
                methodCode={code}
                methodName={traceName}
                signatureLine={signatureLine}
                methodStartLine={startLine}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
