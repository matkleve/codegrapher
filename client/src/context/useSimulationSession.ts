import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { enrichSimSteps } from "@/lib/enrichSimSteps";
import { effectiveEndFileLine } from "@/lib/simTraceBounds";
import { buildSession } from "@/context/buildSimSession";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import type { LineAnchor, SimAnchor } from "@/context/simulationTypes";
import type { SimPanelTab, SimSession } from "@/lib/staticWalk/types";

type SessionArgs = {
  simActive: boolean;
  session: SimSession | null;
  startAnchor: SimAnchor | null;
  endAnchor: LineAnchor | null;
  preflightInputs: Record<string, string>;
  setSimActive: (active: boolean) => void;
  setSession: React.Dispatch<React.SetStateAction<SimSession | null>>;
  setPanelOpen: (open: boolean) => void;
  setPanelTab: (tab: SimPanelTab) => void;
  setPreflightOpen: (open: boolean) => void;
  setLedgerExpanded: React.Dispatch<React.SetStateAction<Set<number>>>;
};

export function useSimulationSession({
  simActive,
  session,
  startAnchor,
  endAnchor,
  preflightInputs,
  setSimActive,
  setSession,
  setPanelOpen,
  setPanelTab,
  setPreflightOpen,
  setLedgerExpanded,
}: SessionArgs) {
  const { graphData } = useGraphInteraction();
  const { symbols } = useIndex();
  const { getNode } = useReactFlow();

  const activateSession = useCallback(
    (anchor: SimAnchor, inputs: Record<string, string>, end?: LineAnchor | null) => {
      const endLine =
        end?.memberId === anchor.memberId
          ? end.line
          : endAnchor?.memberId === anchor.memberId
            ? endAnchor.line
            : effectiveEndFileLine(anchor, null);
      const built = buildSession(anchor, inputs, endLine);
      const next = {
        ...built,
        steps: enrichSimSteps(
          built.steps,
          anchor.flowNodeId,
          symbols,
          graphData,
          getNode,
        ),
      };
      setSession(next);
      setSimActive(true);
      setPanelOpen(true);
      setPanelTab("run");
      setPreflightOpen(false);
      setLedgerExpanded(new Set([0]));
    },
    [
      endAnchor,
      getNode,
      graphData,
      setLedgerExpanded,
      setPanelOpen,
      setPanelTab,
      setPreflightOpen,
      setSession,
      setSimActive,
      symbols,
    ],
  );

  const confirmPreflight = useCallback(() => {
    if (!startAnchor) return;
    if (!endAnchor || endAnchor.memberId !== startAnchor.memberId) return;
    activateSession(startAnchor, preflightInputs);
  }, [activateSession, endAnchor, preflightInputs, startAnchor]);

  const cancelPreflight = useCallback(() => {
    setPreflightOpen(false);
  }, [setPreflightOpen]);

  const applyInputs = useCallback(() => {
    if (!startAnchor) return;
    if (simActive && session) {
      const endLine = session.endLine;
      const prevIndex = session.currentIndex;
      const rebuilt = buildSession(startAnchor, preflightInputs, endLine);
      const next = {
        ...rebuilt,
        steps: enrichSimSteps(
          rebuilt.steps,
          startAnchor.flowNodeId,
          symbols,
          graphData,
          getNode,
        ),
      };
      next.currentIndex = Math.min(prevIndex, Math.max(next.steps.length - 1, 0));
      setSession(next);
      return;
    }
    setPanelTab("inputs");
  }, [preflightInputs, session, simActive, startAnchor, symbols, graphData, getNode, setPanelTab, setSession]);

  return {
    activateSession,
    confirmPreflight,
    cancelPreflight,
    applyInputs,
  };
}
