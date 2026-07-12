import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadSimTracePaths } from "@/lib/simTracePaths";
import { useSubstepPlayer } from "@/hooks/useSubstepPlayer";
import { useSimulationLifecycle } from "@/context/useSimulationLifecycle";
import { useSimulationExit } from "@/context/useSimulationExit";
import { useSimulationAnchors } from "@/context/useSimulationAnchors";
import { useSimulationPaths } from "@/context/useSimulationPaths";
import { useSimulationPulse } from "@/context/useSimulationPulse";
import { useSimulationSession } from "@/context/useSimulationSession";
import { useSimulationTransport } from "@/context/useSimulationTransport";
import { initPreflightInputs } from "@/context/buildSimSession";
import type { LineAnchor, SimAnchor, SimulationContextValue } from "@/context/simulationTypes";
import type { PlaybackSpeed, SimPanelTab, SimSession } from "@/lib/staticWalk/types";

/**
 * Composes simulation state: anchors, session, transport, paths, and C3
 * substep playback. Keeps SimulationContext.tsx a thin provider shell.
 */
export function useSimulationController(): SimulationContextValue {
  const [simActive, setSimActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<SimPanelTab>("run");
  const [session, setSession] = useState<SimSession | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [playing, setPlaying] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightInputs, setPreflightInputs] = useState<Record<string, string>>({});
  const [startAnchor, setStartAnchor] = useState<SimAnchor | null>(null);
  const [endAnchor, setEndAnchor] = useState<LineAnchor | null>(null);
  const [pauseAnchors, setPauseAnchors] = useState<LineAnchor[]>([]);
  const [savedPaths, setSavedPaths] = useState(() => loadSimTracePaths());
  const [ledgerExpanded, setLedgerExpanded] = useState<Set<number>>(() => new Set());

  useSimulationPulse(simActive, session);
  useSimulationLifecycle(simActive, setPanelTab);

  const { exitSimulation, disarmTrace } = useSimulationExit({
    setPlaying,
    setSimActive,
    setSession,
    setPreflightOpen,
    setLedgerExpanded,
    setStartAnchor,
    setEndAnchor,
    setPauseAnchors,
  });

  const requestStartHere = useCallback((anchor: SimAnchor) => {
    setStartAnchor(anchor);
    setEndAnchor((prev) => (prev && prev.memberId !== anchor.memberId ? null : prev));
    setPanelOpen(true);
    setPanelTab("inputs");
    setPreflightInputs((prev) => initPreflightInputs(anchor.signatureLine, prev));
    setPreflightOpen(true);
  }, []);

  const {
    activateSession,
    confirmPreflight,
    cancelPreflight,
    applyInputs,
  } = useSimulationSession({
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
  });

  const anchors = useSimulationAnchors(
    { startAnchor, endAnchor, pauseAnchors, simActive, session },
    {
      setStartAnchor,
      setEndAnchor,
      setPauseAnchors,
      setPanelOpen,
      setPanelTab,
      setPreflightInputs,
      setPreflightOpen,
    },
    requestStartHere,
  );

  const paths = useSimulationPaths({
    startAnchor,
    endAnchor,
    preflightInputs,
    setStartAnchor,
    setEndAnchor,
    setPreflightInputs,
    setSavedPaths,
    setPanelOpen,
    setPanelTab,
    activateSession,
  });

  const transport = useSimulationTransport({
    session,
    playing,
    playbackSpeed,
    pauseAnchors,
    setPlaying,
    setSession,
  });

  const exitSimulationWithTransport = useCallback(() => {
    transport.clearPlayLoop();
    exitSimulation();
  }, [exitSimulation, transport]);

  const disarmTraceWithTransport = useCallback(() => {
    transport.clearPlayLoop();
    disarmTrace();
  }, [disarmTrace, transport]);

  const stopAndClear = useCallback(() => {
    disarmTraceWithTransport();
  }, [disarmTraceWithTransport]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (simActive) {
        exitSimulationWithTransport();
        return;
      }
      if (startAnchor) disarmTraceWithTransport();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disarmTraceWithTransport, exitSimulationWithTransport, simActive, startAnchor]);

  const toggleLedgerRow = useCallback((index: number) => {
    setLedgerExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const currentScope = useMemo(() => {
    if (!session) return new Map();
    return session.steps[session.currentIndex]?.scopeSnapshot ?? new Map();
  }, [session]);

  const currentStep = session?.steps[session.currentIndex];
  const {
    flowSubsteps,
    substepIndex,
    settled: substepsSettled,
    undecomposable: substepUndecomposable,
    fallbackLit: substepFallbackLit,
    fallbackShimmerMs: substepFallbackShimmerMs,
  } = useSubstepPlayer(currentStep, simActive, playbackSpeed);

  return useMemo(
    () => ({
      simActive,
      panelOpen,
      setPanelOpen,
      panelTab,
      setPanelTab,
      session,
      playbackSpeed,
      setPlaybackSpeed,
      playing,
      preflightOpen,
      preflightInputs,
      setPreflightInput: (name: string, value: string) =>
        setPreflightInputs((prev) => ({ ...prev, [name]: value })),
      startAnchor,
      endAnchor,
      pauseAnchors,
      savedPaths,
      ledgerExpanded,
      toggleLedgerRow,
      requestStartHere,
      armStartHere: anchors.armStartHere,
      applyGutterAction: anchors.applyGutterAction,
      toggleEndHere: anchors.toggleEndHere,
      gutterRunRange: anchors.gutterRunRange,
      requestEndHere: anchors.requestEndHere,
      runStartToEnd: anchors.runStartToEnd,
      confirmPreflight,
      cancelPreflight,
      applyInputs,
      saveCurrentPath: paths.saveCurrentPath,
      runSavedPath: paths.runSavedPath,
      removeSavedPath: paths.removeSavedPath,
      duplicateSavedPath: paths.duplicateSavedPath,
      loadPathDraft: paths.loadPathDraft,
      refreshSavedPaths: paths.refreshSavedPaths,
      stepForward: transport.stepForward,
      stepBack: transport.stepBack,
      togglePlay: transport.togglePlay,
      scrubTo: transport.scrubTo,
      exitSimulation: exitSimulationWithTransport,
      disarmTrace: disarmTraceWithTransport,
      stopAndClear,
      effectiveEndLine: anchors.effectiveEndLine,
      traceRangeLabel: anchors.traceRangeLabel,
      currentScope,
      isLineInSimRange: anchors.isLineInSimRange,
      lineGutterRole: anchors.lineGutterRole,
      gutterAnchorState: anchors.gutterAnchorState,
      hasExplicitTraceEnd: anchors.hasExplicitTraceEnd,
      flowSubsteps,
      substepIndex,
      substepsSettled,
      substepUndecomposable,
      substepFallbackLit,
      substepFallbackShimmerMs,
    }),
    [
      simActive,
      panelOpen,
      panelTab,
      session,
      playbackSpeed,
      playing,
      preflightOpen,
      preflightInputs,
      startAnchor,
      endAnchor,
      pauseAnchors,
      savedPaths,
      ledgerExpanded,
      toggleLedgerRow,
      requestStartHere,
      anchors,
      confirmPreflight,
      cancelPreflight,
      applyInputs,
      paths,
      transport,
      exitSimulationWithTransport,
      disarmTraceWithTransport,
      stopAndClear,
      currentScope,
      flowSubsteps,
      substepIndex,
      substepsSettled,
      substepUndecomposable,
      substepFallbackLit,
      substepFallbackShimmerMs,
    ],
  );
}

export type SimulationProviderProps = { children: ReactNode };
