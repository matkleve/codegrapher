import { useCallback, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { toAnchorRect, useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { ctrlPreviewEdgeId, previewLineHandle } from "@/lib/ctrlPreviewHandles";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { symbolKindToSemantic, TOKEN_ANCHOR } from "@/lib/tokenColors";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { cn } from "@/lib/utils";

type CodeLineProps = {
  line: string;
  lineNumber: number;
  memberId: string;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
};

function makeTokenKey(
  sourceFlowId: string,
  memberId: string,
  lineNumber: number,
  token: string,
): string {
  return `${sourceFlowId}::${memberId}::${lineNumber}::${token}`;
}

export function CodeLine({
  line,
  lineNumber,
  memberId,
  sourceFlowId,
  sourceGraphNodeId,
  filePath,
}: CodeLineProps) {
  const { isCtrlHeld } = useCtrlKey();
  const { symbols, lookup, hasSymbol } = useIndex();
  const { getNode } = useReactFlow();
  const {
    graphData,
    setGraphPreview,
    clearPreviewForKey,
    setReferenceCards,
    scheduleHideReferenceCards,
    cancelHideReferenceCards,
    setTokenDropdown,
    activeTokenKey,
    setActiveTokenKey,
    activeTargetHandle,
    previewEdge,
  } = useGraphInteraction();

  const edgeKeyRef = useRef<string | null>(null);
  const chipRefs = useRef<Map<string, TokenChipHandle>>(new Map());

  const clearHover = useCallback(() => {
    if (edgeKeyRef.current) {
      clearPreviewForKey(edgeKeyRef.current);
      edgeKeyRef.current = null;
    }
    scheduleHideReferenceCards();
  }, [clearPreviewForKey, scheduleHideReferenceCards]);

  const onIdentifierEnter = useCallback(
    (name: string, chipKey: string) => {
      if (!isCtrlHeld || !hasSymbol(name)) return;

      const entry = lookup(name);
      if (!entry) return;

      const chip = chipRefs.current.get(chipKey);
      const rightAnchor = chip?.getRightAnchor();
      if (!rightAnchor) return;

      cancelHideReferenceCards();
      const tokenKey = makeTokenKey(sourceFlowId, memberId, lineNumber, name);
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

      if (!resolved) {
        clearPreviewForKey(edgeKey);
        setActiveTokenKey(null);
        return;
      }

      if (resolved.mode === "graph") {
        setReferenceCards(null);
        setGraphPreview(edgeKey, resolved, rightAnchor);
        return;
      }

      clearPreviewForKey(edgeKey);
      const chipEl = rightAnchor.parentElement;
      if (chipEl) {
        setReferenceCards({
          token: name,
          anchor: toAnchorRect(chipEl.getBoundingClientRect()),
          cards: resolved.cards,
        });
      }
    },
    [
      cancelHideReferenceCards,
      clearPreviewForKey,
      getNode,
      graphData,
      hasSymbol,
      isCtrlHeld,
      lineNumber,
      lookup,
      memberId,
      setActiveTokenKey,
      setGraphPreview,
      setReferenceCards,
      sourceFlowId,
      symbols,
    ],
  );

  const onIdentifierClick = useCallback(
    (name: string, el: HTMLElement) => {
      if (!isCtrlHeld || !hasSymbol(name)) return;

      const rect = el.getBoundingClientRect();
      setTokenDropdown({
        token: name,
        x: rect.left,
        y: rect.bottom + 4,
        sourceFlowId,
        sourceGraphNodeId,
        filePath,
        line: lineNumber,
      });
      if (edgeKeyRef.current) clearPreviewForKey(edgeKeyRef.current);
      setReferenceCards(null);
      setActiveTokenKey(null);
    },
    [
      clearPreviewForKey,
      filePath,
      hasSymbol,
      isCtrlHeld,
      lineNumber,
      setActiveTokenKey,
      setReferenceCards,
      setTokenDropdown,
      sourceFlowId,
      sourceGraphNodeId,
    ],
  );

  const tokens = tokenizeLine(line);
  const lineTargetId = previewLineHandle(memberId, lineNumber);
  const lineTargetActive = activeTargetHandle === lineTargetId;

  return (
    <div className="relative overflow-visible whitespace-pre-wrap font-mono text-xs leading-relaxed">
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
        colorClass={
          lineTargetActive && previewEdge
            ? TOKEN_ANCHOR[previewEdge.kind]
            : "bg-border"
        }
      />
      <FlowAnchor
        side="right"
        targetId={lineTargetId}
        size="node"
        visible
        highlighted={lineTargetActive}
        colorClass={
          lineTargetActive && previewEdge
            ? TOKEN_ANCHOR[previewEdge.kind]
            : "bg-border"
        }
      />
      {tokens.map((token, i) => {
        if (token.kind !== "identifier") {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(
                token.kind === "keyword" && "text-primary/80",
                token.kind === "comment" && "text-muted-foreground",
                token.kind === "string" && "text-[color:var(--code-string)]",
                token.kind === "number" && "text-[color:var(--code-number)]",
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

        const interactive = isCtrlHeld;
        const chipKey = `${lineNumber}-${i}`;
        const tokenKey = makeTokenKey(
          sourceFlowId,
          memberId,
          lineNumber,
          token.text,
        );
        const isActive = activeTokenKey === tokenKey;

        return (
          <TokenChip
            key={`${lineNumber}-${i}`}
            ref={(handle) => {
              if (handle) chipRefs.current.set(chipKey, handle);
              else chipRefs.current.delete(chipKey);
            }}
            text={token.text}
            semantic={semantic}
            active={isActive}
            interactive={interactive}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onMouseEnter={() => onIdentifierEnter(token.text, chipKey)}
            onMouseLeave={clearHover}
            onClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onIdentifierClick(token.text, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && interactive) {
                onIdentifierClick(token.text, e.currentTarget);
              }
            }}
          />
        );
      })}
    </div>
  );
}
