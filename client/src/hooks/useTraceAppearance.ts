import { useGraphInteraction } from "@/context/GraphInteractionContext";

type TraceAppearanceArgs = {
  traceKey?: string;
  memberId?: string;
  tokenKind?: "class" | "function" | "type";
};

export function useTraceAppearance({
  traceKey,
  memberId,
}: TraceAppearanceArgs) {
  const {
    isTraceLit,
    isTraceEndpoint,
    isTraceMemberLit,
    isTraceOwnerLit,
    isTraceLineLit,
    isCtrlPreviewMode,
    isTraceActive,
    pinnedTokenKey,
    hoveredTokenKey,
  } = useGraphInteraction();

  const pinnedSource =
    traceKey != null && pinnedTokenKey != null && traceKey === pinnedTokenKey;
  const hoverPreview =
    traceKey != null &&
    hoveredTokenKey != null &&
    traceKey === hoveredTokenKey &&
    hoveredTokenKey !== pinnedTokenKey;

  return {
    isCtrlPreviewMode,
    isTraceActive,
    lit: traceKey ? isTraceLit(traceKey) : false,
    on: traceKey ? isTraceEndpoint(traceKey) : false,
    pinnedSource,
    hoverPreview,
    memberLit: memberId ? isTraceMemberLit(memberId) : false,
    ownerLit: memberId ? isTraceOwnerLit(memberId) : false,
    lineLit: memberId ? isTraceLineLit(memberId) : false,
  };
}
