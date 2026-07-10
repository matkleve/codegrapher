import { useCallback, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId, previewLineHandle } from "@/lib/ctrlPreviewHandles";
import {
  buildLocalPreviewEdges,
  connectionCountForHost,
  resolveLocalTargetId,
} from "@/lib/linksForElement";
import {
  defSiteFor,
  type MemberSymbolIndex,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { cn } from "@/lib/utils";

type CodeLineProps = {
  line: string;
  lineNumber: number;
  memberId: string;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
  definedInLabel: string;
  symbolIndex: MemberSymbolIndex;
};

export function CodeLine({
  line,
  lineNumber,
  memberId,
  sourceFlowId,
  sourceGraphNodeId,
  filePath,
  definedInLabel,
  symbolIndex,
}: CodeLineProps) {
  const { symbols, lookup, hasSymbol } = useIndex();
  const { getNode } = useReactFlow();
  const {
    graphData,
    beginTrace,
    endTrace,
    isHandleActive,
    edgeKindAtHandle,
    scheduleHoverFire,
    scheduleHoverClear,
    showTokenInfo,
    pinTrace,
    pinnedTokenKey,
  } = useGraphInteraction();
  const { lineLit } = useTraceAppearance({ memberId });

  const edgeKeyRef = useRef<string | null>(null);
  const chipRefs = useRef<Map<string, TokenChipHandle>>(new Map());

  const tokens = useMemo(() => tokenizeLine(line), [line]);

  const clearHover = useCallback(() => {
    if (pinnedTokenKey) return;
    edgeKeyRef.current = null;
    endTrace();
  }, [endTrace, pinnedTokenKey]);

  const firePreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      const edgeKey = ctrlPreviewEdgeId(sourceFlowId, `${memberId}::${lineNumber}::${name}`);
      edgeKeyRef.current = edgeKey;

      const entry = lookup(name);
      const kind = entry ? symbolKindToSemantic(entry.kind) : "variable";
      const localEdges = buildLocalPreviewEdges(chipEl, kind, edgeKey);
      if (localEdges.length > 0) {
        beginTrace(tokenKey, localEdges);
        return;
      }

      if (!hasSymbol(name) || !entry) {
        beginTrace(tokenKey, []);
        return;
      }

      const resolved = resolveVisibleTarget(
        name,
        symbols,
        graphData,
        getNode,
        sourceFlowId,
      );

      if (!resolved || resolved.mode !== "graph") {
        beginTrace(tokenKey, []);
        return;
      }

      beginTrace(tokenKey, [buildUsagePreviewEdge(edgeKey, resolved, chipEl, name)]);
    },
    [
      beginTrace,
      getNode,
      graphData,
      hasSymbol,
      lookup,
      memberId,
      lineNumber,
      sourceFlowId,
      symbols,
    ],
  );

  const onIdentifierEnter = useCallback(
    (name: string, chipKey: string) => {
      const chip = chipRefs.current.get(chipKey);
      const chipEl = chip?.getChipElement();
      if (!chipEl) return;
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      if (pinnedTokenKey != null && pinnedTokenKey !== tokenKey) return;
      scheduleHoverFire(tokenKey, () => firePreview(name, chipKey, chipEl), clearHover);
    },
    [
      clearHover,
      firePreview,
      lineNumber,
      memberId,
      pinnedTokenKey,
      scheduleHoverFire,
      sourceFlowId,
    ],
  );

  const onIdentifierLeave = useCallback(
    (name: string) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      if (pinnedTokenKey != null && pinnedTokenKey !== tokenKey) return;
      scheduleHoverClear(tokenKey, clearHover);
    },
    [clearHover, lineNumber, memberId, pinnedTokenKey, scheduleHoverClear, sourceFlowId],
  );

  const onIdentifierClick = useCallback(
    (name: string, el: HTMLElement, isDefinition: boolean) => {
      const entry = lookup(name);
      const kind = entry ? symbolKindToSemantic(entry.kind) : "variable";
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      pinTrace(tokenKey);
      firePreview(name, `${lineNumber}`, el);
      showTokenInfo(
        makeTokenInfo({
          token: name,
          kind,
          pinned: true,
          connectionCount: connectionCountForHost(el, hasSymbol(name) ? name : undefined),
          definedIn: definedInLabel,
          filePath,
          line: lineNumber,
          sourceFlowId,
          sourceGraphNodeId,
          role: isDefinition ? "definition" : "usage",
        }),
      );
      el.animate(
        [{ filter: "brightness(1.7)" }, { filter: "brightness(1)" }],
        { duration: 520, easing: "ease-out" },
      );
    },
    [
      definedInLabel,
      filePath,
      firePreview,
      hasSymbol,
      lineNumber,
      lookup,
      memberId,
      pinTrace,
      showTokenInfo,
      sourceFlowId,
      sourceGraphNodeId,
    ],
  );

  const lineTargetId = previewLineHandle(memberId, lineNumber);
  const lineTargetActive = isHandleActive(lineTargetId);
  const lineKind = edgeKindAtHandle(lineTargetId);

  return (
    <div
      className={cn(
        "code-line relative overflow-visible whitespace-pre-wrap font-mono text-xs leading-relaxed",
        lineLit && "trace-lit-line",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={lineTargetId}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <FlowAnchor
        side="left"
        targetId={lineTargetId}
        size="node"
        visible={lineTargetActive}
        highlighted={lineTargetActive}
        colorClass={lineTargetActive && lineKind ? TOKEN_ANCHOR[lineKind] : "bg-border"}
      />
      {tokens.map((token, i) => {
        if (token.kind !== "identifier") {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(
                token.kind === "keyword" && "code-kw",
                (token.kind === "operator" || token.kind === "other") && "code-pn",
                token.kind === "comment" && "code-comment text-muted-foreground",
                token.kind === "string" && "code-string text-[color:var(--code-string)]",
                token.kind === "number" && "code-number text-[color:var(--code-number)]",
              )}
            >
              {token.text}
            </span>
          );
        }

        const rawLocalTarget = usageTargetFor(symbolIndex, lineNumber, i);
        const localDefId = defSiteFor(symbolIndex, lineNumber, i);
        const localTargetId = rawLocalTarget
          ? resolveLocalTargetId(rawLocalTarget, sourceFlowId)
          : null;
        const indexed = hasSymbol(token.text);
        const interactive = indexed || !!localDefId || !!localTargetId;

        if (!interactive) {
          return <span key={`${lineNumber}-${i}`}>{token.text}</span>;
        }

        const entry = lookup(token.text);
        const semantic = entry ? symbolKindToSemantic(entry.kind) : "variable";
        const chipKey = `${lineNumber}-${i}`;
        const tokenKey = makeUsageTokenKey(
          sourceFlowId,
          memberId,
          lineNumber,
          token.text,
        );

        return (
          <TokenChip
            key={`${lineNumber}-${i}`}
            ref={(handle) => {
              if (handle) chipRefs.current.set(chipKey, handle);
              else chipRefs.current.delete(chipKey);
            }}
            text={token.text}
            semantic={semantic}
            traceKey={tokenKey}
            interactive={interactive}
            localDefId={localDefId}
            localTargetId={localTargetId ?? undefined}
            symbolRole={localDefId ? "definition" : "usage"}
            shimmerDelay={`${((lineNumber * 7 + i) * 0.37).toFixed(2)}s`}
            role="button"
            tabIndex={0}
            onMouseEnter={() => onIdentifierEnter(token.text, chipKey)}
            onMouseLeave={() => onIdentifierLeave(token.text)}
            onClick={(e) => {
              e.stopPropagation();
              onIdentifierClick(token.text, e.currentTarget, !!localDefId);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onIdentifierClick(token.text, e.currentTarget, !!localDefId);
              }
            }}
          />
        );
      })}
    </div>
  );
}
