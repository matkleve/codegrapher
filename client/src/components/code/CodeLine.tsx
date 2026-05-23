import { useCallback } from "react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import {
  classifyIdentifier,
  findTokenReferences,
  isResolvableKind,
  resolveTokenFlowTarget,
} from "@/lib/symbolIndex";
import { TOKEN_HIGHLIGHT } from "@/lib/tokenColors";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { cn } from "@/lib/utils";

type CodeLineProps = {
  line: string;
  lineNumber: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
};

export function CodeLine({
  line,
  lineNumber,
  sourceFlowId,
  sourceGraphNodeId,
  filePath,
}: CodeLineProps) {
  const { isCtrlHeld } = useCtrlKey();
  const {
    symbolIndex,
    graphData,
    setPreviewEdge,
    setTokenDropdown,
  } = useGraphInteraction();

  const clearPreview = useCallback(() => {
    setPreviewEdge(null);
  }, [setPreviewEdge]);

  const onIdentifierEnter = useCallback(
    (name: string) => {
      if (!isCtrlHeld) return;
      const kind = classifyIdentifier(name, symbolIndex);
      if (!isResolvableKind(kind)) return;

      const target = resolveTokenFlowTarget(
        name,
        kind,
        sourceGraphNodeId,
        symbolIndex,
        graphData,
      );
      if (target) {
        setPreviewEdge({ sourceFlowId, targetFlowId: target, kind });
      } else {
        setPreviewEdge(null);
      }
    },
    [
      graphData,
      isCtrlHeld,
      setPreviewEdge,
      sourceFlowId,
      sourceGraphNodeId,
      symbolIndex,
    ],
  );

  const onIdentifierClick = useCallback(
    (name: string, el: HTMLElement) => {
      if (!isCtrlHeld) return;
      const rect = el.getBoundingClientRect();
      const refs = findTokenReferences(name, graphData, symbolIndex);
      const inGraph = refs.some((r) => r.inGraph);

      setTokenDropdown({
        token: name,
        x: rect.left,
        y: rect.bottom + 4,
        sourceFlowId,
        sourceGraphNodeId,
        filePath,
        line: lineNumber,
        inGraph,
      });
      setPreviewEdge(null);
    },
    [
      graphData,
      isCtrlHeld,
      lineNumber,
      setPreviewEdge,
      setTokenDropdown,
      sourceFlowId,
      sourceGraphNodeId,
      symbolIndex,
    ],
  );

  const tokens = tokenizeLine(line);

  return (
    <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
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

        const semantic = classifyIdentifier(token.text, symbolIndex);
        const interactive = isCtrlHeld && semantic !== "plain";

        return (
          <span
            key={`${lineNumber}-${i}`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            className={cn(
              interactive && isResolvableKind(semantic) && TOKEN_HIGHLIGHT[semantic],
              interactive &&
                semantic === "unknown" &&
                "cursor-pointer underline decoration-dotted text-muted-foreground",
            )}
            onMouseEnter={() => onIdentifierEnter(token.text)}
            onMouseLeave={clearPreview}
            onClick={(e) => {
              if (!isCtrlHeld) return;
              e.stopPropagation();
              onIdentifierClick(token.text, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isCtrlHeld) {
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
