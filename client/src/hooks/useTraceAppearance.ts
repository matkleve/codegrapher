import { useGraphInteraction } from "@/context/GraphInteractionContext";

type TraceAppearanceArgs = {
  traceKey?: string;
  memberId?: string;
  flowNodeId?: string;
  tokenKind?: "class" | "function" | "type";
};

export function useTraceAppearance({
  traceKey,
  memberId,
  flowNodeId,
}: TraceAppearanceArgs) {
  const {
    isTraceLit,
    isTraceEndpoint,
    isTraceMemberLit,
    isTraceOwnerLit,
    isTraceLineLit,
    isTraceNodeLit,
    isCtrlPreviewMode,
    isTraceActive,
  } = useGraphInteraction();

  return {
    isCtrlPreviewMode,
    isTraceActive,
    lit: traceKey ? isTraceLit(traceKey) : false,
    on: traceKey ? isTraceEndpoint(traceKey) : false,
    memberLit: memberId ? isTraceMemberLit(memberId) : false,
    ownerLit: memberId ? isTraceOwnerLit(memberId) : false,
    lineLit: memberId ? isTraceLineLit(memberId) : false,
    nodeLit: flowNodeId ? isTraceNodeLit(flowNodeId) : false,
  };
}
