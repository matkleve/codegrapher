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
    isTraceActive,
    isPinnedTokenKey,
    hoveredTokenKey,
  } = useGraphInteraction();

  const pinnedSource = traceKey != null && isPinnedTokenKey(traceKey);
  const hoverPreview =
    traceKey != null &&
    hoveredTokenKey != null &&
    traceKey === hoveredTokenKey &&
    !isPinnedTokenKey(traceKey);

  return {
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
