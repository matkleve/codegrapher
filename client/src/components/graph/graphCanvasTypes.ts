import type { FlowSnapshot } from "@/components/nodes/flowNodeTypes";
import type { GraphData } from "@/types";

export interface GraphCanvasHandle {
  pushHistoryBeforeChange: () => void;
  getSnapshot: () => FlowSnapshot | null;
}

export interface GraphCanvasProps {
  graphData: GraphData | null;
  graphResetKey: number;
  onFileDrop: (filePath: string) => void;
  loading?: boolean;
}
