import { useCallback, useMemo, useRef, type MouseEvent, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { GripVertical } from "lucide-react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildDefinitionPreviewEdges, connectionCountForHost, type DefinitionEdgeContext } from "@/lib/linksForElement";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
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
  const { beginTrace, isCtrlPreviewMode, graphData, lookupIndexedUsageSites } =
    useGraphInteraction();
  const { getNode } = useReactFlow();

  const indexed = Boolean(symbolName && hasSymbol(symbolName));
  const defTokenKey = symbolName ? makeClassDefKey(symbolName) : "";
  const entry = symbolName ? lookup(symbolName) : null;
  const defKind = entry ? symbolKindToSemantic(entry.kind) : null;
  const { lit, on, pinnedSource, hoverPreview } = useTraceAppearance({
    traceKey: indexed ? defTokenKey : undefined,
  });

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId: flowNodeId,
      lookupIndexedUsageSites,
    }),
    [flowNodeId, getNode, graphData, lookupIndexedUsageSites],
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

  const buildTitlePinInfo = useCallback(() => {
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
      pinned: true,
    });
  }, [
    defEdgeContext,
    filePath,
    flowNodeId,
    graphNodeId,
    lookup,
    symbolName,
  ]);

  const { onEnter: onTitleEnter, onLeave: onTitleLeave } = useTokenHover({
    tokenKey: defTokenKey,
    enabled: indexed,
    onFire: fireDefPreview,
    onClear: () => {},
    buildTransientInfo: () => {
      const { pinned: _p, ...rest } = buildTitlePinInfo();
      return rest;
    },
  });

  const { onPinClick: onTitleClick } = useTokenPin({
    tokenKey: defTokenKey,
    enabled: indexed && Boolean(symbolName && defKind),
    onFire: fireDefPreview,
    animateEl: undefined,
    buildPinInfo: () => {
      const { pinned: _p, ...rest } = buildTitlePinInfo();
      return rest;
    },
  });

  const onHeaderClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest(".file-type-chip, .node-card-title")) return;
      e.stopPropagation();
      onToggleCollapsed();
    },
    [onToggleCollapsed],
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
              indexed && isCtrlPreviewMode && "token-interactive",
              lit && "token-chip-lit",
              on && "token-chip-on",
              on && pinnedSource && "token-chip-source",
              on && hoverPreview && "token-chip-hover-preview",
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
            {defKind ? (
              <FlowAnchor
                side="right"
                colorClass={on ? TOKEN_ANCHOR[defKind] : "bg-border"}
                visible={on}
                highlighted={on}
                size="chip"
              />
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
