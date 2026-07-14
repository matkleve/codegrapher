import { memo } from "react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { useGraphTraceState } from "@/context/GraphInteractionContext";
import { TOKEN_ANCHOR } from "@/lib/tokenColors";

/**
 * The left dot on a member row's target handle. Isolated into its own leaf so
 * the member row itself doesn't subscribe to volatile trace state — only this
 * tiny component re-renders when a preview edge lands on the member.
 */
function MemberTargetAnchorComponent({ targetId }: { targetId: string }) {
  const { isHandleActive, edgeKindAtHandle } = useGraphTraceState();
  const active = isHandleActive(targetId);
  const kind = edgeKindAtHandle(targetId);
  return (
    <FlowAnchor
      side="left"
      targetId={targetId}
      size="node"
      visible={active}
      highlighted={active}
      colorClass={active && kind ? TOKEN_ANCHOR[kind] : "bg-border"}
    />
  );
}

export const MemberTargetAnchor = memo(MemberTargetAnchorComponent);
