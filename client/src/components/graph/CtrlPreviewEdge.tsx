import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
  type EdgeProps,
} from "@xyflow/react";
import { TOKEN_EDGE_STROKE, type SemanticTokenKind } from "@/lib/tokenColors";

type CtrlPreviewEdgeData = {
  kind: SemanticTokenKind;
  label?: string;
};

export function CtrlPreviewEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as CtrlPreviewEdgeData | undefined;
  const kind = edgeData?.kind ?? "function";
  const stroke = TOKEN_EDGE_STROKE[kind];

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: 2,
          strokeDasharray: "6 3",
          strokeDashoffset: 24,
          animation: "dash 800ms linear infinite",
        }}
        interactionWidth={0}
      />
      {edgeData?.label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-foreground shadow-sm"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function ctrlPreviewMarkerEnd(kind: SemanticTokenKind) {
  return {
    type: MarkerType.ArrowClosed,
    color: TOKEN_EDGE_STROKE[kind],
    width: 18,
    height: 18,
  };
}
