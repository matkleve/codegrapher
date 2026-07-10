import { useCallback, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction, toAnchorRect } from "@/context/GraphInteractionContext";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId, previewLineHandle } from "@/lib/ctrlPreviewHandles";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
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
};

export function CodeLine({
  line,
  lineNumber,
  memberId,
  sourceFlowId,
  sourceGraphNodeId: _sourceGraphNodeId,
  filePath: _filePath,
  definedInLabel,
}: CodeLineProps) {
  const { isCtrlHeld } = useCtrlKey();
  const { symbols, lookup, hasSymbol } = useIndex();
  const { getNode } = useReactFlow();
  const {
    graphData,
    setPreviewEdges,
    clearPreviewEdges,
    setActiveTokenKey,
    isHandleActive,
    edgeKindAtHandle,
    scheduleHoverFire,
    scheduleHoverClear,
    scheduleInfoOpen,
    showTokenInfo,
  } = useGraphInteraction();
  const { lineLit } = useTraceAppearance({ memberId });

  const edgeKeyRef = useRef<string | null>(null);
  const chipRefs = useRef<Map<string, TokenChipHandle>>(new Map());

  const clearHover = useCallback(() => {
    const key = edgeKeyRef.current;
    if (key) {
      edgeKeyRef.current = null;
      clearPreviewEdges();
    }
    setActiveTokenKey(null);
  }, [clearPreviewEdges, setActiveTokenKey]);

  const firePreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      if (!hasSymbol(name)) return;

      const entry = lookup(name);
      if (!entry) return;

      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      setActiveTokenKey(tokenKey);

      const edgeKey = ctrlPreviewEdgeId(sourceFlowId, name);
      edgeKeyRef.current = edgeKey;

      const resolved = resolveVisibleTarget(
        name,
        symbols,
        graphData,
        getNode,
        sourceFlowId,
      );

      if (!resolved || resolved.mode !== "graph") {
        // Target class isn't loaded — keep the token lit + its socket dot,
        // but there's nothing in the graph to wire to.
        clearPreviewEdges();
        return;
      }

      const edge = buildUsagePreviewEdge(edgeKey, resolved, chipEl);
      setPreviewEdges([edge]);
    },
    [
      clearPreviewEdges,
      getNode,
      graphData,
      hasSymbol,
      lookup,
      setActiveTokenKey,
      setPreviewEdges,
      sourceFlowId,
      symbols,
    ],
  );

  const openInfo = useCallback(
    (name: string, chipEl: HTMLElement) => {
      const entry = lookup(name);
      if (!entry) return;
      const kind = symbolKindToSemantic(entry.kind);
      const refs = (symbols.get(name) ?? []).length;
      showTokenInfo({
        token: name,
        kind,
        anchor: toAnchorRect(chipEl.getBoundingClientRect()),
        pinned: false,
        connectionCount: refs,
        definedIn: definedInLabel,
      });
    },
    [definedInLabel, lookup, showTokenInfo, symbols],
  );

  const onIdentifierEnter = useCallback(
    (name: string, chipKey: string) => {
      if (!hasSymbol(name)) return;

      const chip = chipRefs.current.get(chipKey);
      const chipEl = chip?.getRightAnchor()?.parentElement;
      if (!chipEl) return;

      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);

      scheduleHoverFire(tokenKey, () => firePreview(name, chipKey, chipEl), clearHover);
      scheduleInfoOpen(tokenKey, () => openInfo(name, chipEl));
    },
    [
      clearHover,
      firePreview,
      hasSymbol,
      lineNumber,
      memberId,
      openInfo,
      scheduleHoverFire,
      scheduleInfoOpen,
      sourceFlowId,
    ],
  );

  const onIdentifierLeave = useCallback(
    (name: string) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      scheduleHoverClear(tokenKey, clearHover);
    },
    [clearHover, lineNumber, memberId, scheduleHoverClear, sourceFlowId],
  );

  const onIdentifierClick = useCallback(
    (name: string, el: HTMLElement) => {
      if (!hasSymbol(name) || !isCtrlHeld) return;

      const entry = lookup(name);
      if (!entry) return;
      showTokenInfo({
        token: name,
        kind: symbolKindToSemantic(entry.kind),
        anchor: toAnchorRect(el.getBoundingClientRect()),
        pinned: true,
        connectionCount: (symbols.get(name) ?? []).length,
        definedIn: definedInLabel,
      });
    },
    [definedInLabel, hasSymbol, isCtrlHeld, lookup, showTokenInfo, symbols],
  );

  const tokens = tokenizeLine(line);
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
        visible
        highlighted={lineTargetActive}
        colorClass={lineTargetActive && lineKind ? TOKEN_ANCHOR[lineKind] : "bg-border"}
      />
      <FlowAnchor
        side="right"
        targetId={lineTargetId}
        size="node"
        visible
        highlighted={lineTargetActive}
        colorClass={lineTargetActive && lineKind ? TOKEN_ANCHOR[lineKind] : "bg-border"}
      />
      {tokens.map((token, i) => {
        if (token.kind !== "identifier") {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(
                token.kind === "keyword" && "code-kw text-primary/80",
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

        const entry = lookup(token.text);
        const semantic = entry ? symbolKindToSemantic(entry.kind) : null;
        if (!semantic) {
          return <span key={`${lineNumber}-${i}`}>{token.text}</span>;
        }

        const indexed = hasSymbol(token.text);
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
            interactive={indexed}
            shimmerDelay={`${((lineNumber * 7 + i) * 0.37).toFixed(2)}s`}
            role={indexed ? "button" : undefined}
            tabIndex={indexed ? 0 : undefined}
            onMouseEnter={() => onIdentifierEnter(token.text, chipKey)}
            onMouseLeave={() => onIdentifierLeave(token.text)}
            onClick={(e) => {
              if (!indexed) return;
              e.stopPropagation();
              onIdentifierClick(token.text, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && indexed) {
                onIdentifierClick(token.text, e.currentTarget);
              }
            }}
          />
        );
      })}
    </div>
  );
}
