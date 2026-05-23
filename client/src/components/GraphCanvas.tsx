import { forwardRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphFlowInner } from "@/components/graph/GraphFlowInner";
import type {
  GraphCanvasHandle,
  GraphCanvasProps,
} from "@/components/graph/graphCanvasTypes";

export type { GraphCanvasHandle, GraphCanvasProps } from "@/components/graph/graphCanvasTypes";

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <GraphFlowInner {...props} canvasRef={ref} />
      </ReactFlowProvider>
    );
  },
);

export default GraphCanvas;
