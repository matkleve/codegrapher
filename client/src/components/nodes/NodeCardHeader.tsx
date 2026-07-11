import { useCallback, useMemo, useRef, type MouseEvent, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { GripVertical } from "lucide-react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useIndex } from "@/context/IndexContext";
import { buildDefinitionPreviewEdges } from "@/lib/buildDefinitionPreviewEdges";
import type { DefinitionEdgeContext } from "@/lib/resolveDefinitionUsageSites";
import { connectionCountsForHost } from "@/lib/connectionCounts";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeClassDefKey } from "@/lib/traceKeys";
import {
  buildHoverLoadMenu,
  loadTargetsFromCallSiteRefs,
} from "@/lib/connectionMenu";
import { useTokenContextMenu } from "@/hooks/useTokenContextMenu";
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
  const { beginTrace, graphData, lookupIndexedUsageSites, lookupProjectReferences, lookupOffCanvasCallSiteFiles, cancelHoverLeaveGrace, showConnectionMenu, clearConnectionMenu } =
    useGraphInteraction();
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
    const sites = lookupOffCanvasCallSiteFiles(symbolName);
    const menuState = buildHoverLoadMenu(
      symbolName,
      kind,
      "definition",
      titleRef.current,
      loadTargetsFromCallSiteRefs(symbolName, sites),
      filePath,
    );
    if (menuState) showConnectionMenu(menuState);
    else clearConnectionMenu();
  }, [
    beginTrace,
    clearConnectionMenu,
    defEdgeContext,
    defTokenKey,
    filePath,
    indexed,
    lookup,
    lookupOffCanvasCallSiteFiles,
    showConnectionMenu,
    symbolName,
  ]);

  const buildTitlePinInfo = useCallback(() => {
    const symEntry = lookup(symbolName!);
    const counts = connectionCountsForHost(
      titleRef.current!,
      symbolName!,
      defEdgeContext,
    );
    return makeTokenInfo({
      token: symbolName!,
      kind: symbolKindToSemantic(symEntry!.kind),
      connectionCount: counts.onCanvas,
      projectConnectionCount: counts.inProject,
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

  const openContextMenu = useTokenContextMenu({
    filePath,
    sourceFlowId: flowNodeId,
  });

  const onTitleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!symbolName || !indexed || !titleRef.current || !defKind) return;
      const symEntry = lookup(symbolName);
      openContextMenu(e, {
        token: symbolName,
        kind: defKind,
        role: "definition",
        chipEl: titleRef.current,
        editorLine: symEntry?.line ?? 1,
      });
    },
    [defKind, indexed, lookup, openContextMenu, symbolName],
  );

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
            style={
              indexed
                ? ({ "--shimmer-delay": "0s" } as React.CSSProperties)
                : undefined
            }
            onPointerDown={(e) => e.stopPropagation()}
            onMouseEnter={onTitleEnter}
            onMouseLeave={onTitleLeave}
            onContextMenu={onTitleContextMenu}
            onClick={onTitleClick}
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
