import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import {
  buildSymbolIndex,
  findTokenReferences,
  type SymbolIndex,
  type TokenReference,
} from "@/lib/symbolIndex";
import type { ResolvableTokenKind } from "@/lib/tokenColors";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";
import type { GraphData } from "@/types";

export const PREVIEW_EDGE_ID = "__ctrl_preview_edge__";

export type PreviewEdgeState = {
  sourceFlowId: string;
  targetFlowId: string;
  kind: ResolvableTokenKind;
} | null;

export type TokenDropdownState = {
  token: string;
  x: number;
  y: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
  line: number;
  inGraph: boolean;
} | null;

type GraphInteractionContextValue = {
  symbolIndex: SymbolIndex;
  previewEdge: PreviewEdgeState;
  setPreviewEdge: (edge: PreviewEdgeState) => void;
  tokenDropdown: TokenDropdownState;
  setTokenDropdown: (state: TokenDropdownState) => void;
  findReferences: (token: string) => TokenReference[];
  focusFlowNode: (flowNodeId: string) => void;
  onLoadFile: (filePath: string) => void;
  graphData: GraphData | null;
};

const GraphInteractionContext = createContext<GraphInteractionContextValue | null>(
  null,
);

type GraphInteractionProviderProps = {
  children: ReactNode;
  graphData: GraphData | null;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onLoadFile: (filePath: string) => void;
};

export function GraphInteractionProvider({
  children,
  graphData,
  nodes,
  setNodes,
  onLoadFile,
}: GraphInteractionProviderProps) {
  const { isCtrlHeld } = useCtrlKey();
  const { setCenter, getNode } = useReactFlow();
  const [previewEdge, setPreviewEdge] = useState<PreviewEdgeState>(null);
  const [tokenDropdown, setTokenDropdown] = useState<TokenDropdownState>(null);

  const symbolIndex = useMemo(() => buildSymbolIndex(graphData), [graphData]);

  useEffect(() => {
    if (!isCtrlHeld) {
      setPreviewEdge(null);
      setTokenDropdown(null);
    }
  }, [isCtrlHeld]);

  const findReferences = useCallback(
    (token: string) => findTokenReferences(token, graphData, symbolIndex),
    [graphData, symbolIndex],
  );

  const focusFlowNode = useCallback(
    (flowNodeId: string) => {
      const node = getNode(flowNodeId) ?? nodes.find((n) => n.id === flowNodeId);
      if (!node) return;

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === flowNodeId,
          data: {
            ...n.data,
            selected: n.id === flowNodeId,
            pathHighlighted: n.id === flowNodeId,
          },
        })),
      );

      const w = typeof node.width === "number" ? node.width : 280;
      const h = typeof node.height === "number" ? node.height : 120;
      const cx = node.position.x + w / 2;
      const cy = node.position.y + h / 2;
      void setCenter(cx, cy, { zoom: 1.15, duration: 350 });
      setTokenDropdown(null);
      setPreviewEdge(null);
    },
    [getNode, nodes, setCenter, setNodes],
  );

  const value = useMemo(
    () => ({
      symbolIndex,
      previewEdge,
      setPreviewEdge,
      tokenDropdown,
      setTokenDropdown,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
    }),
    [
      symbolIndex,
      previewEdge,
      tokenDropdown,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
    ],
  );

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

export function useGraphInteractionOptional(): GraphInteractionContextValue | null {
  return useContext(GraphInteractionContext);
}

export function buildPreviewFlowEdge(preview: PreviewEdgeState): Edge | null {
  if (!preview) return null;
  return {
    id: PREVIEW_EDGE_ID,
    source: preview.sourceFlowId,
    target: preview.targetFlowId,
    animated: true,
    selectable: false,
    focusable: false,
    style: {
      stroke: TOKEN_EDGE_STROKE[preview.kind],
      strokeWidth: 2,
      strokeDasharray: "6 4",
    },
  };
}
