import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { previewLineHandle, previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import type { SimSession } from "@/lib/staticWalk/types";

/** Wires call/return transport pulse edges for the active simulation step. */
export function useSimulationPulse(simActive: boolean, session: SimSession | null) {
  const { setPulseEdges, graphData } = useGraphInteraction();
  const { symbols } = useIndex();
  const { getNode } = useReactFlow();

  useEffect(() => {
    if (!session || !simActive) {
      setPulseEdges([]);
      return;
    }
    const step = session.steps[session.currentIndex];
    if (!step?.edgePulse) {
      setPulseEdges([]);
      return;
    }
    const from = {
      type: "handle" as const,
      handle: previewLineHandle(session.memberId, step.lineNumber),
    };
    const callee = step.edgePulse.token
      ? resolveVisibleTarget(
          step.edgePulse.token,
          symbols,
          graphData,
          getNode,
          session.flowNodeId,
        )
      : null;
    let to =
      callee && callee.mode === "graph"
        ? { type: "handle" as const, handle: callee.targetHandle }
        : null;
    if (!to && step.kind === "return") {
      to = { type: "handle" as const, handle: previewTargetTop(session.flowNodeId) };
    }
    if (!to) {
      setPulseEdges([]);
      return;
    }
    setPulseEdges([
      {
        id: `sim-pulse-${session.currentIndex}`,
        from,
        to,
        edgeType: "composition",
        strokeStyle: "solid",
        arrowhead: "open",
        pulse: true,
      },
    ]);
  }, [session, simActive, setPulseEdges, symbols, graphData, getNode]);
}
