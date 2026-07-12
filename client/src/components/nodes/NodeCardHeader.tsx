import { useCallback, useMemo, useRef, type MouseEvent, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { GripVertical } from "lucide-react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useDefinitionTrace } from "@/hooks/useDefinitionTrace";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useIndex } from "@/context/IndexContext";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeClassDefKey } from "@/lib/traceKeys";
import { cn } from "@/lib/utils";

type NodeCardHeaderProps = {
  title: string;
  symbolName?: string;
  filePath: string;
  flowNodeId: string;
  graphNodeId: string;
  chip?: ReactNode;
  bodyExpanded: boolean;
  onToggleCollapsed: () => void;
};

export function NodeCardHeader({
  title,
  symbolName,
  filePath,
  flowNodeId,
  graphNodeId,
  chip,
  bodyExpanded,
  onToggleCollapsed,
}: NodeCardHeaderProps) {
  const titleRef = useRef<HTMLSpanElement>(null);
  useTraceHostRegistration(titleRef);
  const { lookup, hasSymbol } = useIndex();
  const {
    graphData,
    lookupIndexedUsageSites,
    lookupProjectReferences,
    lookupOffCanvasCallSiteFiles,
    cancelHoverLeaveGrace,
  } = useGraphInteraction();
  const { getNode } = useReactFlow();

  const indexed = Boolean(symbolName && hasSymbol(symbolName));
  const defTokenKey = symbolName ? makeClassDefKey(symbolName) : "";
  const entry = symbolName ? lookup(symbolName) : null;
  const defKind = entry ? symbolKindToSemantic(entry.kind) : null;

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId: flowNodeId,
      lookupIndexedUsageSites,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
    }),
    [flowNodeId, getNode, graphData, lookupIndexedUsageSites, lookupOffCanvasCallSiteFiles, lookupProjectReferences],
  );

  const defTrace = useDefinitionTrace({
    anchorRef: titleRef,
    tokenKey: defTokenKey,
    traceName: symbolName ?? title,
    defKind,
    enabled: indexed,
    defEdgeContext,
    filePath,
    definedIn: symbolName ?? title,
    line: entry?.line ?? 1,
    flowNodeId,
    graphNodeId,
    editorLine: entry?.line ?? 1,
  });

  const onHeaderClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest(".file-type-chip, .node-card-title")) return;
      e.stopPropagation();
      cancelHoverLeaveGrace();
      onToggleCollapsed();
    },
    [cancelHoverLeaveGrace, onToggleCollapsed],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        NODE_DRAG_HANDLE,
        "node-card-header flex cursor-grab overflow-hidden border-b border-border active:cursor-grabbing",
        bodyExpanded ? "rounded-t-lg" : "rounded-lg",
      )}
      title="Drag to move — click to expand/collapse"
      aria-expanded={bodyExpanded}
      aria-label={bodyExpanded ? "Collapse class" : "Expand class"}
      onClick={onHeaderClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cancelHoverLeaveGrace();
          onToggleCollapsed();
        }
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2">
        {chip}
        <div className="flex min-w-0 items-center gap-2">
          <ExpandChevron
            expanded={bodyExpanded}
            headerHoverPreview
            className="node-card-caret shrink-0 text-muted-foreground"
          />
          <span
            ref={titleRef}
            data-symbol-name={indexed ? symbolName : undefined}
            data-symbol-role={indexed ? "definition" : undefined}
            data-trace-key={indexed ? defTokenKey : undefined}
            data-token-kind={indexed ? defKind ?? undefined : undefined}
            className={cn(
              "node-card-title nodrag relative inline-block min-w-0 w-fit max-w-full text-[length:var(--font-size-sm)] font-bold",
              indexed && "token-def-label cursor-pointer",
            )}
            role={indexed ? "button" : undefined}
            tabIndex={indexed ? 0 : undefined}
            style={
              indexed
                ? ({ "--shimmer-delay": "0s" } as React.CSSProperties)
                : undefined
            }
            onPointerDown={(e) => e.stopPropagation()}
            onMouseEnter={defTrace.onEnter}
            onMouseLeave={defTrace.onLeave}
            onFocus={defTrace.onFocus}
            onBlur={defTrace.onBlur}
            onContextMenu={defTrace.onContextMenu}
            onClick={defTrace.onPinClick}
            onKeyDown={
              indexed
                ? (e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      defTrace.onPinClick(e as unknown as React.MouseEvent);
                    }
                  }
                : undefined
            }
          >
            {indexed && defKind ? (
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
            <span className="token-shimmer-target" data-text={title}>
              {title}
            </span>
          </span>
        </div>
      </div>
      <div
        className="node-drag-grip flex shrink-0 items-center self-stretch py-2 pr-2"
        aria-hidden
      >
        <GripVertical className="size-4" />
      </div>
    </div>
  );
}
