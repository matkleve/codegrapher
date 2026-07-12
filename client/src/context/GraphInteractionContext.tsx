import { createContext, useContext, type ReactNode } from "react";
import type { Node } from "@xyflow/react";
import {
  type GraphInteractionContextValue,
  type AnchorRect,
  toAnchorRect,
} from "@/context/graphInteractionTypes";
import { useGraphInteractionController } from "@/context/useGraphInteractionController";
import type { ReadingFocus } from "@/lib/graphReadingFocus";
import type { GraphData } from "@/types";

export type { PreviewEdgeSpec, AnchorRef } from "@/lib/previewEdgeTypes";
export { edgeTouchesHandle, refinePreviewEdge } from "@/lib/resolveLiveAnchor";
export type { TokenInfoState } from "@/lib/tokenContextInfo";
export type { GraphInteractionContextValue, AnchorRect };
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

const GraphInteractionContext = createContext<GraphInteractionContextValue | null>(
  null,
);

export function GraphInteractionProvider({
  children,
  ...options
}: GraphInteractionProviderProps) {
  const value = useGraphInteractionController(options);
  return (
    <GraphInteractionContext.Provider value={value}>
      {children}
    </GraphInteractionContext.Provider>
  );
}

export function useGraphInteraction(): GraphInteractionContextValue {
  const ctx = useContext(GraphInteractionContext);
  if (!ctx) {
    throw new Error("useGraphInteraction must be used within GraphInteractionProvider");
  }
  return ctx;
}
