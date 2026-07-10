import { useCallback, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { CodeLine } from "@/components/code/CodeLine";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
import {
  buildDefinitionPreviewEdges,
  connectionCountForHost,
  type DefinitionEdgeContext,
} from "@/lib/linksForElement";
import {
  buildMemberSymbolIndex,
  memberDefId,
} from "@/lib/localSymbolLinks";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeMemberDefKey } from "@/lib/traceKeys";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { cn } from "@/lib/utils";

type CollapsibleMemberRowProps = {
  memberId: string;
  label: string;
  symbolName?: string;
  code: string;
  expanded: boolean;
  onToggle: (memberId: string) => void;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
};

export function CollapsibleMemberRow({
  memberId,
  label,
  symbolName,
  code,
  expanded,
  onToggle,
  flowNodeId,
  graphNodeId,
  filePath,
  classLabel,
}: CollapsibleMemberRowProps) {
  const lines = code.split("\n");
  const memberHandleId = previewMemberHandle(memberId);
  const labelRef = useRef<HTMLSpanElement>(null);
  const { lookup, hasSymbol } = useIndex();
  const {
    isHandleActive,
    edgeKindAtHandle,
    beginTrace,
    isCtrlPreviewMode,
    graphData,
  } = useGraphInteraction();
  const { getNode } = useReactFlow();

  const traceName = symbolName ?? label;
  const defTokenKey = makeMemberDefKey(flowNodeId, memberId);
  const localDefId = memberDefId(memberId);
  const entry = lookup(traceName);
  const defKind = entry ? symbolKindToSemantic(entry.kind) : symbolName ? "function" : null;
  const traceable = hasSymbol(traceName) || Boolean(symbolName);
  const symbolIndex = useMemo(
    () => buildMemberSymbolIndex(memberId, code),
    [memberId, code],
  );

  const { lit, on, memberLit, ownerLit, pinnedSource, hoverPreview } = useTraceAppearance({
    traceKey: traceable ? defTokenKey : undefined,
    memberId,
  });

  const clearDefHover = useCallback(() => {}, []);

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId: flowNodeId,
      sourceMemberId: memberId,
    }),
    [flowNodeId, getNode, graphData, memberId],
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
  }, [beginTrace, defEdgeContext, defKind, defTokenKey, traceName, traceable]);

  const { onEnter: onDefEnter, onLeave: onDefLeave } = useTokenHover({
    tokenKey: defTokenKey,
    enabled: traceable,
    onFire: fireDefPreview,
    onClear: clearDefHover,
  });

  const { onPinClick: onDefClick } = useTokenPin({
    tokenKey: defTokenKey,
    enabled: traceable && Boolean(defKind),
    onFire: fireDefPreview,
    animateEl: undefined,
    buildPinInfo: () =>
      makeTokenInfo({
        token: traceName,
        kind: defKind!,
        connectionCount: connectionCountForHost(
          labelRef.current!,
          traceName,
          defEdgeContext,
        ),
        definedIn: classLabel,
        filePath,
        line: 1,
        sourceFlowId: flowNodeId,
        sourceGraphNodeId: graphNodeId,
        role: "definition",
      }),
  });

  const targetActive = isHandleActive(memberHandleId);
  const memberKind = edgeKindAtHandle(memberHandleId);

  return (
    <div
      data-member-id={memberId}
      className={cn(
        "member-row nodrag relative overflow-visible rounded-md bg-muted",
        memberLit && "trace-member-lit",
        ownerLit && "trace-member-owner-lit",
      )}
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
          "member-row-header",
          INTERACTIVE_SURFACE,
          "flex w-full cursor-pointer items-center gap-2 border-x-0 border-t-0 px-2 py-1.5 text-left",
          expanded ? "member-row-header--expanded" : "member-row-header--collapsed",
        )}
        aria-expanded={expanded}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
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
            traceable && isCtrlPreviewMode && "token-interactive",
            lit && "token-chip-lit",
            on && "token-chip-on",
            on && pinnedSource && "token-chip-source",
            on && hoverPreview && "token-chip-hover-preview",
          )}
          style={
            traceable
              ? ({ "--shimmer-delay": `-${(memberId.length * 0.37).toFixed(2)}s` } as React.CSSProperties)
              : undefined
          }
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={onDefEnter}
          onMouseLeave={onDefLeave}
          onClick={onDefClick}
        >
          {defKind ? (
            <FlowAnchor
              side="right"
              colorClass={on ? TOKEN_ANCHOR[defKind] : "bg-border"}
              visible={on}
              highlighted={on}
              size="chip"
            />
          ) : null}
          <span className="token-shimmer-target" data-text={label}>
            {label}
          </span>
        </span>
      </button>
      {expanded && code.trim() ? (
        <div className="member-body-wrap nodrag overflow-visible px-2 pb-2 pl-5 pt-1.5 text-muted-foreground">
          <div className="flex flex-col gap-0.5">
            {lines.map((line, i) => (
              <CodeLine
                key={`${memberId}-${i}`}
                line={line}
                lineNumber={i + 1}
                memberId={memberId}
                sourceFlowId={flowNodeId}
                sourceGraphNodeId={graphNodeId}
                filePath={filePath}
                definedInLabel={classLabel}
                symbolIndex={symbolIndex}
                memberSymbolName={symbolName}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
