import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  CLASS_NODE_MIN_HEIGHT,
  computeClassNodeHeight,
  fitLayoutToHeight,
} from "@/lib/classNodeLayout";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { CommitNode } from "@/components/nodes/useClassNodeCommit";

type ResizeParams = { width: number; height: number };

type ClassNodeResizeArgs = {
  nodeData: ClassNodeData;
  nodeWidth: number;
  nodeHeight: number | undefined;
  bodyExpanded: boolean;
  cardRef: RefObject<HTMLDivElement | null>;
  commitNode: CommitNode;
};

/**
 * Live snap-to-content resize (see CLAUDE.md). The drag distance decides which
 * members are open at their breakpoints; the box height is then pinned to that
 * open-set's measured content height so it never overflows or leaves a gap, and
 * the resize handle sticks to the bottom of what's open.
 */
export function useClassNodeResize({
  nodeData,
  nodeWidth,
  nodeHeight,
  bodyExpanded,
  cardRef,
  commitNode,
}: ClassNodeResizeArgs) {
  const [isDragging, setIsDragging] = useState(false);

  const applyResize = useCallback(
    (params: ResizeParams) => {
      const fitted = fitLayoutToHeight(
        { ...nodeData, width: params.width, collapsed: false },
        params.height,
        { ignorePinned: true },
      );
      const height = fitted.collapsed
        ? CLASS_NODE_MIN_HEIGHT
        : computeClassNodeHeight({ ...nodeData, ...fitted, collapsed: false });
      commitNode(
        { width: params.width, height, ...fitted },
        { width: params.width, height },
        { keepPreference: true },
      );
    },
    [commitNode, nodeData],
  );

  const onResize = useCallback(
    (_event: unknown, params: ResizeParams) => {
      if (!isDragging) setIsDragging(true);
      applyResize(params);
    },
    [applyResize, isDragging],
  );

  const onResizeEnd = useCallback(
    (_event: unknown, params: ResizeParams) => {
      setIsDragging(false);
      applyResize(params);
    },
    [applyResize],
  );

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const prevHeight = el.style.height;
    el.style.height = "auto";
    const measured = Math.ceil(el.scrollHeight);
    el.style.height = prevHeight;

    if (!bodyExpanded) {
      if (nodeHeight != null && Math.abs(measured - nodeHeight) <= 1) return;
      commitNode({}, { width: nodeWidth, height: measured }, { keepPreference: true });
      return;
    }

    // During an active drag React Flow owns the height (the body clips via
    // flex-1 + overflow-hidden, so nothing spills). On release we snap the box
    // to the measured content — exact, no leftover gap, no clipped row.
    if (isDragging) return;
    const snapped = Math.max(CLASS_NODE_MIN_HEIGHT, measured);
    if (nodeHeight != null && Math.abs(snapped - nodeHeight) <= 1) return;
    commitNode({ height: snapped }, { width: nodeWidth, height: snapped }, {
      keepPreference: true,
    });
  }, [
    bodyExpanded,
    cardRef,
    commitNode,
    isDragging,
    nodeData.expandedMethodIds,
    nodeData.expandedPropertyIds,
    nodeData.filePath,
    nodeData.label,
    nodeData.methodsSectionCollapsed,
    nodeData.propertiesSectionCollapsed,
    nodeHeight,
    nodeWidth,
  ]);

  return { isDragging, onResize, onResizeEnd };
}
