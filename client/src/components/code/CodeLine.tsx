import { useCallback, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { ctrlPreviewEdgeId, previewLineHandle, previewSourceHandle } from "@/lib/ctrlPreviewHandles";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { symbolKindToSemantic, TOKEN_HIGHLIGHT } from "@/lib/tokenColors";
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
  } = useGraphInteraction();

  const edgeKeyRef = useRef<string | null>(null);

  const clearHover = useCallback(() => {
    if (edgeKeyRef.current) {
      clearPreviewForKey(edgeKeyRef.current);
      edgeKeyRef.current = null;
    }
    scheduleHideReferenceCards();
  }, [clearPreviewForKey, scheduleHideReferenceCards]);

  const onIdentifierEnter = useCallback(
    (name: string, el: HTMLElement) => {
      if (!isCtrlHeld || !hasSymbol(name)) return;

      const entry = lookup(name);
      if (!entry) return;

      cancelHideReferenceCards();
      const edgeKey = ctrlPreviewEdgeId(sourceFlowId, name);
      edgeKeyRef.current = edgeKey;

      const resolved = resolveVisibleTarget(
        name,
        symbols,
        graphData,
        getNode,
        sourceFlowId,
        memberId,
        lineNumber,
      );

      if (!resolved) {
        clearPreviewForKey(edgeKey);
        return;
      }

      if (resolved.mode === "graph") {
        setGraphPreview(edgeKey, sourceFlowId, resolved);
        return;
      }

      clearPreviewForKey(edgeKey);
      const rect = el.getBoundingClientRect();
      setReferenceCards({
        token: name,
        x: rect.left,
        y: rect.bottom,
        cards: resolved.cards,
      });
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
    },
    [
      clearPreviewForKey,
      filePath,
      hasSymbol,
      isCtrlHeld,
      lineNumber,
      setReferenceCards,
      setTokenDropdown,
      sourceFlowId,
      sourceGraphNodeId,
    ],
  );

  const tokens = tokenizeLine(line);
  const sourceHandleId = previewSourceHandle(memberId, lineNumber);
  const lineTargetId = previewLineHandle(memberId, lineNumber);

  return (
    <div className="relative whitespace-pre-wrap font-mono text-xs leading-relaxed">
      <Handle
        type="source"
        position={Position.Right}
        id={sourceHandleId}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id={lineTargetId}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      {tokens.map((token, i) => {
        if (token.kind !== "identifier") {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(
                token.kind === "keyword" && "text-primary/80",
                token.kind === "comment" && "text-muted-foreground",
                token.kind === "string" && "text-amber-200/90",
                token.kind === "number" && "text-orange-300/90",
              )}
            >
              {token.text}
            </span>
          );
        }

        const entry = lookup(token.text);
        const semantic = entry ? symbolKindToSemantic(entry.kind) : null;
        const interactive = isCtrlHeld && semantic !== null;

        return (
          <span
            key={`${lineNumber}-${i}`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            className={cn(
              interactive && semantic && TOKEN_HIGHLIGHT[semantic],
            )}
            onMouseEnter={(e) => onIdentifierEnter(token.text, e.currentTarget)}
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
          >
            {token.text}
          </span>
        );
      })}
    </div>
  );
}
