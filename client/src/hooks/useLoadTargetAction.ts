import { useCallback } from "react";
import { useGraphActions } from "@/context/GraphInteractionContext";
import { collectGraphFilePaths, isFileInGraph } from "@/lib/graphFiles";

/** Load a definition file into the graph, or refresh wires when already present. */
export function useLoadTargetAction() {
  const {
    graphData,
    onLoadFile,
    refreshLoadTraces,
    cancelHoverLeaveGrace,
  } = useGraphActions();

  return useCallback(
    (filePath: string) => {
      cancelHoverLeaveGrace();
      const graphPaths = collectGraphFilePaths(graphData);
      if (isFileInGraph(filePath, graphPaths)) {
        refreshLoadTraces();
        return;
      }
      void onLoadFile(filePath);
    },
    [cancelHoverLeaveGrace, graphData, onLoadFile, refreshLoadTraces],
  );
}
