import { useGraphActions } from "@/context/GraphInteractionContext";
import { useCodeLineIdentifierHandlers } from "@/components/code/useCodeLineIdentifierHandlers";
import { useCodeLinePreviewFires } from "@/components/code/useCodeLinePreviewFires";
import type { CodeLineProps } from "@/components/code/codeLineTypes";
import type { CodeToken } from "@/lib/tokenizeLine";

type PreviewArgs = CodeLineProps & {
  tokens: CodeToken[];
  isLinkableIdentifier: (idx: number) => boolean;
};

/**
 * Composes CodeLine's trace/preview fires and identifier hover/click handlers.
 * Keeps CodeLine.tsx a thin render file.
 */
export function useCodeLinePreview(args: PreviewArgs) {
  const fires = useCodeLinePreviewFires(args);
  const identifiers = useCodeLineIdentifierHandlers({
    ...args,
    chipRefs: fires.chipRefs,
    defEdgeContext: fires.defEdgeContext,
    clearHover: fires.clearHover,
    firePreview: fires.firePreview,
    signalPreview: fires.signalPreview,
    fireDefPreview: fires.fireDefPreview,
    signalDefPreview: fires.signalDefPreview,
    hasSymbol: fires.hasSymbol,
    lookup: fires.lookup,
  });

  const {
    scheduleHoverFire,
    scheduleHoverClear,
    pinTrace,
    showTokenInfo,
  } = useGraphActions();

  return {
    ...fires,
    ...identifiers,
    scheduleHoverFire,
    scheduleHoverClear,
    pinTrace,
    showTokenInfo,
  };
}
