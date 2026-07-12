import type { RefObject } from "react";
import { Handle, Position } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { MemberSignatureTags } from "@/components/nodes/MemberSignatureTags";
import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import type { LexicalGraph } from "@/lib/lexicalGraph";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import type { MethodSignature } from "@/lib/parseMethodSignature";
import type { OverrideInfo } from "@/lib/overrideInfo";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MemberRowHeaderProps = {
  memberId: string;
  traceName: string;
  traceable: boolean;
  defTokenKey: string;
  localDefId: string;
  defKind: SemanticTokenKind | null;
  expanded: boolean;
  labelRef: RefObject<HTMLSpanElement | null>;
  memberHandleId: string;
  targetActive: boolean;
  memberKind: SemanticTokenKind | null;
  methodSignature: MethodSignature | null;
  overrideInfo: OverrideInfo | null;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  symbolIndex: MemberSymbolIndex;
  lexicalGraph: LexicalGraph;
  code: string;
  startLine: number;
  onToggle: (memberId: string) => void;
  onCancelHoverLeaveGrace: () => void;
  onOverrideClick: (e: React.MouseEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPinClick: (e: React.MouseEvent) => void;
};

export function MemberRowHeader({
  memberId,
  traceName,
  traceable,
  defTokenKey,
  localDefId,
  defKind,
  expanded,
  labelRef,
  memberHandleId,
  targetActive,
  memberKind,
  methodSignature,
  overrideInfo,
  flowNodeId,
  graphNodeId,
  filePath,
  classLabel,
  symbolIndex,
  lexicalGraph,
  code,
  startLine,
  onToggle,
  onCancelHoverLeaveGrace,
  onOverrideClick,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  onContextMenu,
  onPinClick,
}: MemberRowHeaderProps) {
  return (
    <>
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
          onCancelHoverLeaveGrace();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onCancelHoverLeaveGrace();
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
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          onContextMenu={onContextMenu}
          onClick={onPinClick}
          onKeyDown={
            traceable
              ? (e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onPinClick(e as unknown as React.MouseEvent);
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
            onClick={onOverrideClick}
          >
            ↑ overrides {overrideInfo.parentClass}.{overrideInfo.methodName}
          </Button>
        ) : null}
      </button>
    </>
  );
}
