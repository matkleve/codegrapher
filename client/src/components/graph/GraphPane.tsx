import { forwardRef, useSyncExternalStore, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import {
  isTracePending as getTracePending,
  subscribeTracePending,
} from "@/lib/pendingTraceChip";
import {
  isTraceLitFading as getTraceLitFading,
  subscribeTraceLitFading,
} from "@/lib/traceLitFading";
import {
  isTraceDomFading as getTraceDomFading,
  subscribeTraceSessionMood,
} from "@/lib/traceSessionMood";
import { cn } from "@/lib/utils";
import { TraceSessionDebugOverlay } from "@/components/graph/TraceSessionDebugOverlay";

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
    const isTracePending = useSyncExternalStore(
      subscribeTracePending,
      getTracePending,
      () => false,
    );
    const isTraceLeaving = useSyncExternalStore(
      subscribeTraceLitFading,
      getTraceLitFading,
      () => false,
    );
    const isDomFading = useSyncExternalStore(
      subscribeTraceSessionMood,
      getTraceDomFading,
      () => false,
    );

    return (
      <div
        ref={ref}
        className={cn(
          "graph-pane relative min-h-0 flex-1 overflow-hidden bg-background",
          isCtrlActive && "graph-ctrl-preview",
          isTracePending && "graph-trace-pending",
          (isTraceActive || isTraceLeaving) && "graph-trace-active",
          isTraceLeaving && "graph-trace-leaving",
          isDomFading && "graph-trace-fading-out",
          isTraceActive && isWarm && "graph-trace-warm",
          pinnedTraces.length > 0 && "graph-trace-pinned",
        )}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClickCapture={onClickCapture}
      >
        {children}
        <TraceSessionDebugOverlay />
      </div>
    );
  },
);
