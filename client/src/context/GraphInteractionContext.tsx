import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCtrlKey } from "@/context/CtrlKeyContext";
import { useIndex } from "@/context/IndexContext";
import { ctrlPreviewMarkerEnd } from "@/components/graph/CtrlPreviewEdge";
import {
  findSemanticReferences,
  type TokenReference,
} from "@/lib/semanticLookup";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type {
  ExternalReferenceCard,
  GraphVisibleTarget,
} from "@/lib/resolveVisibleTarget";
import type { GraphData } from "@/types";

export type PreviewEdgeConfig = {
  id: string;
  sourceFlowId: string;
  sourceHandle: string;
  targetFlowId: string;
  targetHandle: string;
  kind: SemanticTokenKind;
  label?: string;
};

export type AnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type ReferenceCardsState = {
  token: string;
  anchor: AnchorRect;
  cards: ExternalReferenceCard[];
} | null;

export function toAnchorRect(rect: DOMRect): AnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export type TokenDropdownState = {
  token: string;
  x: number;
  y: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
  line: number;
} | null;

type GraphInteractionContextValue = {
  previewEdges: PreviewEdgeConfig[];
  setGraphPreview: (
    edgeKey: string,
    sourceFlowId: string,
    target: GraphVisibleTarget | null,
  ) => void;
  clearPreviewForKey: (edgeKey: string) => void;
  activeTokenKey: string | null;
  setActiveTokenKey: (key: string | null) => void;
  referenceCards: ReferenceCardsState;
  setReferenceCards: (state: ReferenceCardsState) => void;
  scheduleHideReferenceCards: () => void;
  cancelHideReferenceCards: () => void;
  tokenDropdown: TokenDropdownState;
  setTokenDropdown: (state: TokenDropdownState) => void;
  findReferences: (token: string) => TokenReference[];
  focusFlowNode: (flowNodeId: string) => void;
  onLoadFile: (filePath: string) => void | Promise<void>;
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
  onLoadFile: (filePath: string) => void | Promise<void>;
};

export function GraphInteractionProvider({
  children,
  graphData,
  nodes,
  setNodes,
  onLoadFile,
}: GraphInteractionProviderProps) {
  const { isCtrlHeld } = useCtrlKey();
  const { symbols } = useIndex();
  const { setCenter, getNode } = useReactFlow();
  const [previewEdges, setPreviewEdges] = useState<PreviewEdgeConfig[]>([]);
  const [activeTokenKey, setActiveTokenKey] = useState<string | null>(null);
  const [referenceCards, setReferenceCards] = useState<ReferenceCardsState>(null);
  const [tokenDropdown, setTokenDropdown] = useState<TokenDropdownState>(null);
  const tempEdgeIdsRef = useRef<Set<string>>(new Set());
  const hideCardsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllPreviews = useCallback(() => {
    tempEdgeIdsRef.current.clear();
    setPreviewEdges([]);
    setReferenceCards(null);
    setActiveTokenKey(null);
  }, []);

  useEffect(() => {
    if (!isCtrlHeld) {
      clearAllPreviews();
      setTokenDropdown(null);
      if (hideCardsTimerRef.current) {
        clearTimeout(hideCardsTimerRef.current);
        hideCardsTimerRef.current = null;
      }
    }
  }, [clearAllPreviews, isCtrlHeld]);

  const clearPreviewForKey = useCallback((edgeKey: string) => {
    tempEdgeIdsRef.current.delete(edgeKey);
    setPreviewEdges((prev) => prev.filter((e) => e.id !== edgeKey));
  }, []);

  const setGraphPreview = useCallback(
    (edgeKey: string, sourceFlowId: string, target: GraphVisibleTarget | null) => {
      setReferenceCards(null);
      if (!target) {
        clearPreviewForKey(edgeKey);
        return;
      }

      const config: PreviewEdgeConfig = {
        id: edgeKey,
        sourceFlowId,
        sourceHandle: target.sourceHandle,
        targetFlowId: target.flowNodeId,
        targetHandle: target.targetHandle,
        kind: target.kind,
        label: target.label,
      };

      tempEdgeIdsRef.current.add(edgeKey);
      setPreviewEdges((prev) => [...prev.filter((e) => e.id !== edgeKey), config]);
    },
    [clearPreviewForKey],
  );

  const scheduleHideReferenceCards = useCallback(() => {
    if (hideCardsTimerRef.current) clearTimeout(hideCardsTimerRef.current);
    hideCardsTimerRef.current = setTimeout(() => {
      setReferenceCards(null);
      setActiveTokenKey(null);
      hideCardsTimerRef.current = null;
    }, 150);
  }, []);

  const cancelHideReferenceCards = useCallback(() => {
    if (hideCardsTimerRef.current) {
      clearTimeout(hideCardsTimerRef.current);
      hideCardsTimerRef.current = null;
    }
  }, []);

  const findReferences = useCallback(
    (token: string) => findSemanticReferences(token, symbols, graphData),
    [graphData, symbols],
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

      const w = typeof node.width === "number" ? node.width : 320;
      const h = typeof node.height === "number" ? node.height : 120;
      const cx = node.position.x + w / 2;
      const cy = node.position.y + h / 2;
      void setCenter(cx, cy, { zoom: 1.15, duration: 350 });
      setTokenDropdown(null);
      clearAllPreviews();
    },
    [clearAllPreviews, getNode, nodes, setCenter, setNodes],
  );

  const value = useMemo(
    () => ({
      previewEdges,
      setGraphPreview,
      clearPreviewForKey,
      activeTokenKey,
      setActiveTokenKey,
      referenceCards,
      setReferenceCards,
      scheduleHideReferenceCards,
      cancelHideReferenceCards,
      tokenDropdown,
      setTokenDropdown,
      findReferences,
      focusFlowNode,
      onLoadFile,
      graphData,
    }),
    [
      previewEdges,
      setGraphPreview,
      clearPreviewForKey,
      activeTokenKey,
      setActiveTokenKey,
      referenceCards,
      scheduleHideReferenceCards,
      cancelHideReferenceCards,
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

export function buildPreviewFlowEdges(configs: PreviewEdgeConfig[]): Edge[] {
  return configs.map((config) => ({
    id: config.id,
    type: "ctrlPreview",
    source: config.sourceFlowId,
    target: config.targetFlowId,
    sourceHandle: config.sourceHandle,
    targetHandle: config.targetHandle,
    selectable: false,
    focusable: false,
    data: { kind: config.kind, label: config.label },
    markerEnd: ctrlPreviewMarkerEnd(config.kind),
  }));
}
