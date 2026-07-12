import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import {
  applyReadingFocusToNodes,
  clearReadingFocusFromNodes,
  clearFocusFromUrl,
  findFocusTargetElement,
  normalizeReadingFocus,
  parseFocusFromUrl,
  resolveFocusFromClick,
  scrollToReadingPosition,
  writeFocusToUrl,
  type ReadingFocus,
} from "@/lib/graphReadingFocus";
import { clearElementRegistry } from "@/lib/elementRegistry";

type UseGraphReadingFocusOptions = {
  graphPaneRef: RefObject<HTMLDivElement | null>;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  graphResetKey: number;
  syncGrid: () => void;
};

export function useGraphReadingFocus({
  graphPaneRef,
  nodes,
  setNodes,
  graphResetKey,
  syncGrid,
}: UseGraphReadingFocusOptions) {
  const urlFocusAppliedRef = useRef(false);
  const [readingFocus, setReadingFocus] = useState<ReadingFocus | null>(null);
  const { getViewport, setViewport, screenToFlowPosition } = useReactFlow();

  const runReadingFocusLayout = useCallback(
    (focus: ReadingFocus) => {
      const pane = graphPaneRef.current;
      if (!pane) return;

      setNodes((nds) => applyReadingFocusToNodes(nds, focus));
      writeFocusToUrl(focus);

      requestAnimationFrame(() => {
        const targetEl = findFocusTargetElement(focus);
        if (!targetEl) return;
        scrollToReadingPosition({
          paneEl: pane,
          targetEl,
          getViewport,
          setViewport,
          screenToFlowPosition,
        });
        syncGrid();
      });
    },
    [getViewport, graphPaneRef, screenToFlowPosition, setNodes, setViewport, syncGrid],
  );

  const selectReadingFocus = useCallback((focus: ReadingFocus | null) => {
    setReadingFocus(focus);
  }, []);

  const focusReadingMember = useCallback(
    (flowNodeId: string, memberId: string) => {
      const focus: ReadingFocus = { flowNodeId, memberId };
      selectReadingFocus(focus);
      runReadingFocusLayout(focus);
    },
    [runReadingFocusLayout, selectReadingFocus],
  );

  const focusReadingView = useCallback(() => {
    if (!readingFocus) return;
    runReadingFocusLayout(readingFocus);
  }, [readingFocus, runReadingFocusLayout]);

  const handleReadingFocusCapture = useCallback(
    (e: React.MouseEvent) => {
      selectReadingFocus(resolveFocusFromClick(e.target));
    },
    [selectReadingFocus],
  );

  useEffect(() => {
    if (!readingFocus) {
      clearFocusFromUrl();
      setNodes((nds) => clearReadingFocusFromNodes(nds));
    }
  }, [readingFocus, setNodes]);

  useEffect(() => {
    if (!readingFocus) return;
    const normalized = normalizeReadingFocus(nodes, readingFocus);
    if (
      normalized.flowNodeId !== readingFocus.flowNodeId ||
      normalized.memberId !== readingFocus.memberId
    ) {
      setReadingFocus(normalized);
    }
  }, [nodes, readingFocus]);

  useEffect(() => {
    urlFocusAppliedRef.current = false;
    setReadingFocus(null);
    clearElementRegistry();
  }, [graphResetKey]);

  useEffect(() => {
    if (nodes.length === 0 || urlFocusAppliedRef.current) return;
    urlFocusAppliedRef.current = true;
    const urlFocus = parseFocusFromUrl();
    if (!urlFocus) return;
    if (!nodes.some((n) => n.id === urlFocus.flowNodeId)) return;

    setReadingFocus(urlFocus);
    runReadingFocusLayout(urlFocus);
  }, [nodes, runReadingFocusLayout]);

  return {
    readingFocus,
    hasReadingFocus: readingFocus != null,
    selectReadingFocus,
    focusReadingMember,
    focusReadingView,
    handleReadingFocusCapture,
  };
}
