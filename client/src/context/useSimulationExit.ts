import { useCallback } from "react";
import { useGraphActions } from "@/context/GraphInteractionContext";
import type { LineAnchor, SimAnchor } from "@/context/simulationTypes";
import type { SimSession } from "@/lib/staticWalk/types";

type ExitSetters = {
  setPlaying: (v: boolean) => void;
  setSimActive: (v: boolean) => void;
  setSession: React.Dispatch<React.SetStateAction<SimSession | null>>;
  setPreflightOpen: (v: boolean) => void;
  setLedgerExpanded: React.Dispatch<React.SetStateAction<Set<number>>>;
  setStartAnchor: React.Dispatch<React.SetStateAction<SimAnchor | null>>;
  setEndAnchor: React.Dispatch<React.SetStateAction<LineAnchor | null>>;
  setPauseAnchors: React.Dispatch<React.SetStateAction<LineAnchor[]>>;
};

export function useSimulationExit({
  setPlaying,
  setSimActive,
  setSession,
  setPreflightOpen,
  setLedgerExpanded,
  setStartAnchor,
  setEndAnchor,
  setPauseAnchors,
}: ExitSetters) {
  const { setPulseEdges } = useGraphActions();

  const exitSimulation = useCallback(() => {
    setPlaying(false);
    setSimActive(false);
    setSession(null);
    setPreflightOpen(false);
    setLedgerExpanded(new Set());
    setPulseEdges([]);
  }, [setLedgerExpanded, setPlaying, setPreflightOpen, setPulseEdges, setSession, setSimActive]);

  const disarmTrace = useCallback(() => {
    exitSimulation();
    setStartAnchor(null);
    setEndAnchor(null);
    setPauseAnchors([]);
  }, [exitSimulation, setEndAnchor, setPauseAnchors, setStartAnchor]);

  return { exitSimulation, disarmTrace };
}
