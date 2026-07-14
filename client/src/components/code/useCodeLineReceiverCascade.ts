import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { buildLocalPreviewEdges } from "@/lib/localDefLinks";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { semanticFromChipElement } from "@/lib/tokenColors";
import { useGraphActions } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import type { CodeToken } from "@/lib/tokenizeLine";

type CascadeArgs = {
  tokens: CodeToken[];
  lineNumber: number;
  chipRefs: React.RefObject<Map<string, TokenChipHandle>>;
  isLinkableIdentifier: (idx: number) => boolean;
  sourceFlowId: string;
};

export function useCodeLineReceiverCascade({
  tokens,
  lineNumber,
  chipRefs,
  isLinkableIdentifier,
  sourceFlowId,
}: CascadeArgs) {
  const { symbols, lookup, hasSymbol } = useIndex();
  const { graphData } = useGraphActions();
  const { getNode } = useReactFlow();

  return useCallback(
    (tokenIndex: number, edgeKeyBase: string): PreviewEdgeSpec[] => {
      if (!Number.isFinite(tokenIndex)) return [];
      const receiverIndices = memberAccessReceiverIndices(tokens, tokenIndex);
      const edges: PreviewEdgeSpec[] = [];
      for (const receiverIdx of receiverIndices) {
        const receiverTok = tokens[receiverIdx];
        if (!receiverTok || !isLinkableIdentifier(receiverIdx)) continue;
        const receiverEl = chipRefs.current
          .get(`${lineNumber}-${receiverIdx}`)
          ?.getChipElement();
        if (!receiverEl) continue;

        const receiverKind = semanticFromChipElement(receiverEl, lookup(receiverTok.text));
        const receiverEdgeKey = `${edgeKeyBase}-cascade-${receiverIdx}`;
        const localReceiverEdges = buildLocalPreviewEdges(receiverEl, receiverKind, receiverEdgeKey);
        if (localReceiverEdges.length > 0) {
          edges.push(...localReceiverEdges);
          continue;
        }
        if (!hasSymbol(receiverTok.text)) continue;
        const resolvedReceiver = resolveVisibleTarget(
          receiverTok.text,
          symbols,
          graphData,
          getNode,
          sourceFlowId,
        );
        if (resolvedReceiver?.mode === "graph") {
          edges.push(
            buildUsagePreviewEdge(receiverEdgeKey, resolvedReceiver, receiverEl, receiverTok.text),
          );
        }
      }
      return edges;
    },
    [chipRefs, getNode, graphData, hasSymbol, isLinkableIdentifier, lineNumber, lookup, sourceFlowId, symbols, tokens],
  );
}
