import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useJumpTooltip } from "@/context/JumpTooltipContext";
import { commitTokenPin } from "@/hooks/useTokenTrace";
import { expandJumpTarget } from "@/lib/expandJumpTarget";
import { makeTokenInfoFromJumpTarget } from "@/lib/tokenContextInfo";
import {
  jumpTargetForWireEnd,
  resolveJumpTargetElement,
  traceKeyForJumpTarget,
} from "@/lib/resolveJumpTarget";
import type { LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

/**
 * Click a wire hit-zone: pin + focus the far endpoint. If that endpoint sits
 * inside a collapsed class or an unexpanded method, expand it first and
 * re-resolve once the expand has rendered (two rAFs, same convention as
 * `applyLoadTraceRebuild`).
 */
export function useJumpClick() {
  const { pinTrace, beginTrace, showTokenInfo, focusFlowNode } = useGraphInteraction();
  const { setJumpTooltip } = useJumpTooltip();
  const { getNode, setNodes } = useReactFlow();

  return useCallback(
    (spec: PreviewEdgeSpec, end: "from" | "to") => (e: MouseEvent) => {
      e.stopPropagation();
      const { ref, hint } = jumpTargetForWireEnd(spec, end, getNode);
      const el = resolveJumpTargetElement(ref, hint, getNode);
      if (!el) return;

      const commitJump = (target: HTMLElement, h: LiveAnchorHint | undefined) => {
        const traceKey = traceKeyForJumpTarget(target, h);
        if (!traceKey) return;
        commitTokenPin({
          pinTrace,
          showTokenInfo,
          tokenKey: traceKey,
          onFire: () => beginTrace(traceKey, [spec]),
          buildPinInfo: () => makeTokenInfoFromJumpTarget(target, h, spec.kind, true),
          animateEl: target,
        });
        if (h?.flowNodeId) focusFlowNode(h.flowNodeId);
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
        setJumpTooltip(null);
      };

      if (el.hasAttribute("data-flow-anchor-target")) {
        expandJumpTarget(hint, setNodes);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            commitJump(resolveJumpTargetElement(ref, hint, getNode) ?? el, hint);
          });
        });
        return;
      }

      commitJump(el, hint);
    },
    [beginTrace, focusFlowNode, getNode, pinTrace, setJumpTooltip, setNodes, showTokenInfo],
  );
}
