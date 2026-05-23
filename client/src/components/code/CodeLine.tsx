import { useCallback } from "react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { resolveFlowTargetFromIndex } from "@/lib/semanticLookup";
import { symbolKindToSemantic, TOKEN_HIGHLIGHT } from "@/lib/tokenColors";
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
  const { symbols, lookup, hasSymbol } = useIndex();
  const { graphData, setPreviewEdge, setTokenDropdown } = useGraphInteraction();

  const clearPreview = useCallback(() => {
    setPreviewEdge(null);
  }, [setPreviewEdge]);

  const onIdentifierEnter = useCallback(
    (name: string) => {
      if (!isCtrlHeld || !hasSymbol(name)) return;

      const entry = lookup(name);
      if (!entry) return;

      const target = resolveFlowTargetFromIndex(
        name,
        sourceGraphNodeId,
        symbols,
        graphData,
      );
      if (target) {
        setPreviewEdge({
          sourceFlowId,
          targetFlowId: target.flowNodeId,
          kind: target.kind,
        });
      } else {
        setPreviewEdge(null);
      }
    },
    [
      graphData,
      hasSymbol,
      isCtrlHeld,
      lookup,
      setPreviewEdge,
      sourceFlowId,
      sourceGraphNodeId,
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
      setPreviewEdge(null);
    },
    [
      filePath,
      hasSymbol,
      isCtrlHeld,
      lineNumber,
      setPreviewEdge,
      setTokenDropdown,
      sourceFlowId,
      sourceGraphNodeId,
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
            onMouseEnter={() => onIdentifierEnter(token.text)}
            onMouseLeave={clearPreview}
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
