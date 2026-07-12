import { forwardRef, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { cn } from "@/lib/utils";

type GraphPaneProps = {
  children: ReactNode;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onClickCapture?: (e: MouseEvent<HTMLDivElement>) => void;
};

/** Mood root for Ctrl greyout + trace dim — classes scoped to the graph pane only. */
export const GraphPane = forwardRef<HTMLDivElement, GraphPaneProps>(
  function GraphPane({ children, onDragOver, onDrop, onClickCapture }, ref) {
    const { isCtrlActive } = useCtrlKey();
    const { isTraceActive, isWarm, pinnedTraces } = useGraphInteraction();

    return (
      <div
        ref={ref}
        className={cn(
          "graph-pane relative min-h-0 flex-1 overflow-hidden bg-background",
          isCtrlActive && "graph-ctrl-preview",
          isTraceActive && "graph-trace-active",
          isTraceActive && isWarm && "graph-trace-warm",
          pinnedTraces.length > 0 && "graph-trace-pinned",
        )}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    );
  },
);
