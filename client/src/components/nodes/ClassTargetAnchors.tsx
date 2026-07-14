import { memo } from "react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { useGraphTraceState } from "@/context/GraphInteractionContext";
import { previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { TOKEN_ANCHOR } from "@/lib/tokenColors";

/**
 * The two side dots on a class node's top target handle. Isolated into its own
 * leaf so ClassNode itself doesn't subscribe to volatile trace state — only this
 * tiny component re-renders when a preview edge lands on the node.
 */
function ClassTargetAnchorsComponent({ flowNodeId }: { flowNodeId: string }) {
  const { isHandleActive, edgeKindAtHandle } = useGraphTraceState();
  const targetId = previewTargetTop(flowNodeId);
  const active = isHandleActive(targetId);
  const kind = edgeKindAtHandle(targetId);
  const colorClass = active && kind ? TOKEN_ANCHOR[kind] : "bg-border";
  return (
    <>
      <FlowAnchor
        side="left"
        targetId={targetId}
        size="node"
        visible
        highlighted={active}
        colorClass={colorClass}
      />
      <FlowAnchor
        side="right"
        targetId={targetId}
        size="node"
        visible
        highlighted={active}
        colorClass={colorClass}
      />
    </>
  );
}

export const ClassTargetAnchors = memo(ClassTargetAnchorsComponent);
