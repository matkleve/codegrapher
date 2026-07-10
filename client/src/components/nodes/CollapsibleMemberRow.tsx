import { useCallback, useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { CodeLine } from "@/components/code/CodeLine";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { toAnchorRect, useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildDefinitionFanOutEdges } from "@/lib/buildPreviewEdges";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
import { resolveUsageAnchors } from "@/lib/resolveUsageAnchors";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
import { makeMemberDefKey } from "@/lib/traceKeys";
import { cn } from "@/lib/utils";

type CollapsibleMemberRowProps = {
  memberId: string;
  label: string;
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
  const { isCtrlHeld } = useCtrlKey();
  const { lookup, hasSymbol } = useIndex();
  const {
    isHandleActive,
    edgeKindAtHandle,
    setActiveTokenKey,
    setPreviewEdges,
    clearPreviewEdges,
    scheduleHoverFire,
    scheduleHoverClear,
    scheduleInfoOpen,
    showTokenInfo,
    isCtrlPreviewMode,
  } = useGraphInteraction();

  const defTokenKey = makeMemberDefKey(flowNodeId, memberId);
  const entry = lookup(label);
  const defKind = entry ? symbolKindToSemantic(entry.kind) : null;
  const { lit, on, memberLit, ownerLit } = useTraceAppearance({
    traceKey: defTokenKey,
    memberId,
  });

  const clearDefHover = useCallback(() => {
    clearPreviewEdges();
    setActiveTokenKey(null);
  }, [clearPreviewEdges, setActiveTokenKey]);

  const targetActive = isHandleActive(memberHandleId);
  const memberKind = edgeKindAtHandle(memberHandleId);
  const indexed = hasSymbol(label);

  const fireDefPreview = useCallback(() => {
    if (!indexed || !labelRef.current) return;

    const defEntry = lookup(label);
    if (!defEntry) return;

    setActiveTokenKey(defTokenKey);
    const kind = symbolKindToSemantic(defEntry.kind);
    const usages = resolveUsageAnchors(label, labelRef.current);
    const edges = buildDefinitionFanOutEdges(
      label,
      kind,
      labelRef.current,
      usages,
    );
    setPreviewEdges(edges);
  }, [defTokenKey, indexed, label, lookup, setActiveTokenKey, setPreviewEdges]);

  const openDefInfo = useCallback(() => {
    if (!indexed || !labelRef.current) return;
    const entry = lookup(label);
    if (!entry) return;
    showTokenInfo({
      token: label,
      kind: symbolKindToSemantic(entry.kind),
      anchor: toAnchorRect(labelRef.current.getBoundingClientRect()),
      pinned: false,
      connectionCount: resolveUsageAnchors(label).length,
      definedIn: classLabel,
    });
  }, [classLabel, indexed, label, lookup, showTokenInfo]);

  const onDefEnter = useCallback(() => {
    if (!indexed) return;
    scheduleHoverFire(defTokenKey, fireDefPreview);
    scheduleInfoOpen(defTokenKey, openDefInfo);
  }, [defTokenKey, fireDefPreview, indexed, openDefInfo, scheduleHoverFire, scheduleInfoOpen]);

  const onDefLeave = useCallback(() => {
    if (!indexed) return;
    scheduleHoverClear(defTokenKey, clearDefHover);
  }, [clearDefHover, defTokenKey, indexed, scheduleHoverClear]);

  const onDefClick = useCallback(
    (e: React.MouseEvent) => {
      if (!indexed) return;
      e.stopPropagation();
      if (!isCtrlHeld) return;
      if (!labelRef.current) return;
      const entry = lookup(label);
      if (!entry) return;
      showTokenInfo({
        token: label,
        kind: symbolKindToSemantic(entry.kind),
        anchor: toAnchorRect(labelRef.current.getBoundingClientRect()),
        pinned: true,
        connectionCount: resolveUsageAnchors(label).length,
        definedIn: classLabel,
      });
    },
    [classLabel, indexed, isCtrlHeld, label, lookup, showTokenInfo],
  );

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
        visible
        highlighted={targetActive}
        colorClass={targetActive && memberKind ? TOKEN_ANCHOR[memberKind] : "bg-border"}
      />
      <FlowAnchor
        side="right"
        targetId={memberHandleId}
        size="node"
        visible
        highlighted={targetActive}
        colorClass={targetActive && memberKind ? TOKEN_ANCHOR[memberKind] : "bg-border"}
      />
      <button
        type="button"
        className={cn(
          "member-row-header group/member",
          INTERACTIVE_SURFACE,
          "control-row-compact flex w-full cursor-pointer items-center gap-2 rounded-none border-x-0 border-t-0 text-left",
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(memberId);
        }}
      >
        <ExpandChevron
          expanded={expanded}
          groupHoverFlip="member"
          className="member-row-caret text-muted-foreground"
        />
        <span
          ref={labelRef}
          data-symbol-name={indexed ? label : undefined}
          data-symbol-role={indexed ? "definition" : undefined}
          data-trace-key={indexed ? defTokenKey : undefined}
          data-token-kind={indexed ? defKind ?? undefined : undefined}
          className={cn(
            "member-row-label min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] font-medium text-foreground",
            indexed && "token-def-label cursor-pointer",
            indexed && isCtrlPreviewMode && "token-interactive",
            lit && "token-chip-lit",
            on && "token-chip-on",
          )}
          style={
            indexed
              ? ({ "--shimmer-delay": `${memberId.length * 0.37}s` } as React.CSSProperties)
              : undefined
          }
          onMouseEnter={onDefEnter}
          onMouseLeave={onDefLeave}
          onClick={onDefClick}
        >
          {label}
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
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
