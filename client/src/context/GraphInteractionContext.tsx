import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Node } from "@xyflow/react";
import {
  type GraphInteractionContextValue,
  type GraphActionsValue,
  type GraphTraceStateValue,
  type AnchorRect,
  toAnchorRect,
} from "@/context/graphInteractionTypes";
import { useGraphInteractionController } from "@/context/useGraphInteractionController";
import type { ReadingFocus } from "@/lib/graphReadingFocus";
import type { GraphData } from "@/types";

export type { PreviewEdgeSpec, AnchorRef } from "@/lib/previewEdgeTypes";
export { edgeTouchesHandle, refinePreviewEdge } from "@/lib/resolveLiveAnchor";
export type { TokenInfoState } from "@/lib/tokenContextInfo";
export type {
  GraphInteractionContextValue,
  GraphActionsValue,
  GraphTraceStateValue,
  AnchorRect,
};
export { toAnchorRect };

type GraphInteractionProviderProps = {
  children: ReactNode;
  graphData: GraphData | null;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onLoadFile: (filePath: string) => void | Promise<void>;
  onSelectReadingFocus?: (focus: ReadingFocus | null) => void;
  onFocusReadingMember?: (flowNodeId: string, memberId: string) => void;
};

/**
 * Two contexts, one provider. `GraphActionsContext` holds identity-stable
 * callbacks/lookups (never changes on hover); `GraphTraceStateContext` holds the
 * volatile hover/trace state. Splitting them means hot, multiplied components
 * (code lines, member rows) can read actions only and stop re-rendering on every
 * pointer move. Read the volatile context only in tiny leaf components (the
 * target-anchor dots). See `token-hover.atlas.supplement.md`.
 */
const GraphActionsContext = createContext<GraphActionsValue | null>(null);
const GraphTraceStateContext = createContext<GraphTraceStateValue | null>(null);

export function GraphInteractionProvider({
  children,
  ...options
}: GraphInteractionProviderProps) {
  const { actions, traceState } = useGraphInteractionController(options);
  return (
    <GraphActionsContext.Provider value={actions}>
      <GraphTraceStateContext.Provider value={traceState}>
        {children}
      </GraphTraceStateContext.Provider>
    </GraphActionsContext.Provider>
  );
}

/** Identity-stable actions/lookups. Reading this does NOT re-render on hover. */
export function useGraphActions(): GraphActionsValue {
  const ctx = useContext(GraphActionsContext);
  if (!ctx) {
    throw new Error("useGraphActions must be used within GraphInteractionProvider");
  }
  return ctx;
}

/** Volatile hover/trace state. Reading this re-renders on every pointer move. */
export function useGraphTraceState(): GraphTraceStateValue {
  const ctx = useContext(GraphTraceStateContext);
  if (!ctx) {
    throw new Error("useGraphTraceState must be used within GraphInteractionProvider");
  }
  return ctx;
}

/**
 * Back-compat merged view for consumers that need both slices. Subscribes to the
 * volatile context, so it re-renders on hover — prefer `useGraphActions` for
 * hot/multiplied components.
 */
export function useGraphInteraction(): GraphInteractionContextValue {
  const actions = useGraphActions();
  const traceState = useGraphTraceState();
  return useMemo(
    () => ({ ...actions, ...traceState }),
    [actions, traceState],
  );
}
