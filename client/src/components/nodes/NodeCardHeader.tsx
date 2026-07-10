import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { GripVertical } from "lucide-react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { INTERACTIVE_BORDER_BTN } from "@/lib/controlTokens";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildDefinitionPreviewEdges, connectionCountForHost, type DefinitionEdgeContext } from "@/lib/linksForElement";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
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
  const { lookup, hasSymbol } = useIndex();
  const { beginTrace, endTrace, isCtrlPreviewMode, pinnedTokenKey, graphData } =
    useGraphInteraction();
  const { getNode } = useReactFlow();

  const indexed = Boolean(symbolName && hasSymbol(symbolName));
  const defTokenKey = symbolName ? makeClassDefKey(symbolName) : "";
  const entry = symbolName ? lookup(symbolName) : null;
  const defKind = entry ? symbolKindToSemantic(entry.kind) : null;
  const { lit, on } = useTraceAppearance({
    traceKey: indexed ? defTokenKey : undefined,
  });

  const clearDefHover = useCallback(() => {
    if (pinnedTokenKey) return;
    endTrace();
  }, [endTrace, pinnedTokenKey]);

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId: flowNodeId,
    }),
    [flowNodeId, getNode, graphData],
  );

  const fireDefPreview = useCallback(() => {
    if (!symbolName || !indexed || !titleRef.current) return;
    const symEntry = lookup(symbolName);
    if (!symEntry) return;
    const kind = symbolKindToSemantic(symEntry.kind);
    beginTrace(
      defTokenKey,
      buildDefinitionPreviewEdges(
        symbolName,
        kind,
        titleRef.current,
        defEdgeContext,
      ),
    );
  }, [beginTrace, defEdgeContext, defTokenKey, indexed, lookup, symbolName]);

  const { onEnter: onTitleEnter, onLeave: onTitleLeave } = useTokenHover({
    tokenKey: defTokenKey,
    enabled: indexed,
    onFire: fireDefPreview,
    onClear: clearDefHover,
  });

  const { onPinClick: onTitleClick } = useTokenPin({
    tokenKey: defTokenKey,
    enabled: indexed && Boolean(symbolName && defKind),
    onFire: fireDefPreview,
    animateEl: undefined,
    buildPinInfo: () => {
      const symEntry = lookup(symbolName!);
      return makeTokenInfo({
        token: symbolName!,
        kind: symbolKindToSemantic(symEntry!.kind),
        connectionCount: connectionCountForHost(
          titleRef.current!,
          symbolName!,
          defEdgeContext,
        ),
        definedIn: symbolName!,
        filePath,
        line: symEntry!.line,
        sourceFlowId: flowNodeId,
        sourceGraphNodeId: graphNodeId,
        role: "definition",
      });
    },
  });

  return (
    <div
      className={cn(
        NODE_DRAG_HANDLE,
        "node-card-header flex overflow-hidden cursor-grab active:cursor-grabbing",
        bodyExpanded ? "rounded-t-lg border-b border-border" : "rounded-lg",
      )}
      title="Drag to move"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2">
        {chip}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={`node-card-caret group/caret ${INTERACTIVE_BORDER_BTN} nodrag flex size-[var(--control-height-compact)] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)]`}
            title={bodyExpanded ? "Collapse" : "Expand"}
            aria-label={bodyExpanded ? "Collapse" : "Expand"}
            aria-expanded={bodyExpanded}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapsed();
            }}
          >
            <ExpandChevron expanded={bodyExpanded} groupHoverFlip="caret" />
          </button>
          <span className="min-w-0 flex-1">
            <span
              ref={titleRef}
              data-symbol-name={indexed ? symbolName : undefined}
              data-symbol-role={indexed ? "definition" : undefined}
              data-trace-key={indexed ? defTokenKey : undefined}
              data-token-kind={indexed ? defKind ?? undefined : undefined}
              className={cn(
                "node-card-title nodrag inline-block w-fit max-w-full text-[length:var(--font-size-sm)] font-bold",
                indexed && "token-def-label cursor-pointer",
                indexed && isCtrlPreviewMode && "token-interactive",
                lit && "token-chip-lit",
                on && "token-chip-on",
              )}
              style={
                indexed
                  ? ({ "--shimmer-delay": "0s" } as React.CSSProperties)
                  : undefined
              }
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={onTitleEnter}
              onMouseLeave={onTitleLeave}
              onClick={onTitleClick}
            >
              {title}
            </span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center self-stretch py-2 pr-2">
        <button
          type="button"
          className="node-drag-grip"
          aria-label="Drag to move"
          title="Drag to move"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
