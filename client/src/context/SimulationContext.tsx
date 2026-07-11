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
import { useReactFlow } from "@xyflow/react";
import { buildStepList } from "@/lib/staticWalk/buildStepList";
import { extractParamNames, scopeAtStep } from "@/lib/staticWalk/scopeAtStep";
import { previewLineHandle, previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { AnchorRef } from "@/lib/previewEdgeTypes";
import type {
  PlaybackSpeed,
  SimSession,
  SimStep,
  SimValue,
} from "@/lib/staticWalk/types";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";

type SimAnchor = {
  flowNodeId: string;
  memberId: string;
  methodName: string;
  code: string;
  signatureLine: string;
  startLine: number;
  endLine?: number;
};

type SimulationContextValue = {
  simActive: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  session: SimSession | null;
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  playing: boolean;
  preflightOpen: boolean;
  preflightInputs: Record<string, string>;
  setPreflightInput: (name: string, value: string) => void;
  startAnchor: SimAnchor | null;
  endAnchor: { line: number } | null;
  requestStartHere: (anchor: SimAnchor) => void;
  requestEndHere: (line: number) => void;
  runStartToEnd: (anchor: SimAnchor) => void;
  confirmPreflight: () => void;
  cancelPreflight: () => void;
  stepForward: () => void;
  stepBack: () => void;
  togglePlay: () => void;
  scrubTo: (index: number) => void;
  exitSimulation: () => void;
  currentScope: Map<string, SimValue>;
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

const PLAY_INTERVAL_MS = 600;

function buildSession(
  anchor: SimAnchor,
  inputs: Record<string, string>,
  endLine: number,
): SimSession {
  const parsed = buildStepList(anchor.code, anchor.startLine, endLine);
  const paramNames = extractParamNames(anchor.signatureLine);
  const steps: SimStep[] = parsed.map((stmt) => ({
    lineNumber: stmt.lineNumber,
    text: stmt.text,
    kind: stmt.kind,
    scopeSnapshot: scopeAtStep(anchor.code, stmt.lineNumber, inputs, paramNames),
    edgePulse:
      stmt.kind === "call" || stmt.kind === "return"
        ? { fromLine: stmt.lineNumber, token: stmt.text.match(/(\w+)\s*\(/)?.[1] }
        : undefined,
  }));

  return {
    flowNodeId: anchor.flowNodeId,
    memberId: anchor.memberId,
    methodName: anchor.methodName,
    startLine: anchor.startLine,
    endLine,
    inputs,
    steps,
    currentIndex: 0,
  };
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { setPulseEdges, endHoverPreview, graphData } = useGraphInteraction();
  const { symbols } = useIndex();
  const { getNode } = useReactFlow();
  const [simActive, setSimActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [session, setSession] = useState<SimSession | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [playing, setPlaying] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightInputs, setPreflightInputs] = useState<Record<string, string>>({});
  const [startAnchor, setStartAnchor] = useState<SimAnchor | null>(null);
  const [endAnchor, setEndAnchor] = useState<{ line: number } | null>(null);
  const playLoopRef = useRef(0);

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
    // Value-flow pulse travels from the current call/return line to the callee
    // it targets: calls pulse to the resolved on-canvas definition; returns
    // (and calls whose callee is off-canvas) pulse out to the owning node
    // header. If nothing resolves there is no path, so emit no pulse rather
    // than a degenerate self-edge.
    const from: AnchorRef = {
      type: "handle",
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
    let to: AnchorRef | null =
      callee && callee.mode === "graph"
        ? { type: "handle", handle: callee.targetHandle }
        : null;
    if (!to && step.kind === "return") {
      to = { type: "handle", handle: previewTargetTop(session.flowNodeId) };
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

  useEffect(() => {
    document.documentElement.classList.toggle("graph-sim-active", simActive);
    return () => document.documentElement.classList.remove("graph-sim-active");
  }, [simActive]);

  useEffect(() => {
    if (simActive) endHoverPreview();
  }, [simActive, endHoverPreview]);

  const exitSimulation = useCallback(() => {
    setPlaying(false);
    setSimActive(false);
    setSession(null);
    setPreflightOpen(false);
    setStartAnchor(null);
    setEndAnchor(null);
    setPulseEdges([]);
    window.clearInterval(playLoopRef.current);
  }, [setPulseEdges]);

  const activateSession = useCallback(
    (anchor: SimAnchor, inputs: Record<string, string>) => {
      const endLine = endAnchor?.line ?? anchor.code.split("\n").length;
      const next = buildSession(anchor, inputs, endLine);
      setSession(next);
      setSimActive(true);
      setPanelOpen(true);
      setPreflightOpen(false);
    },
    [endAnchor],
  );

  const requestStartHere = useCallback((anchor: SimAnchor) => {
    setStartAnchor(anchor);
    setPanelOpen(true);
    const params = extractParamNames(anchor.signatureLine);
    const defaults: Record<string, string> = {};
    for (const p of params) defaults[p] = "";
    setPreflightInputs(defaults);
    setPreflightOpen(true);
  }, []);

  const requestEndHere = useCallback((line: number) => {
    setEndAnchor({ line });
  }, []);

  const runStartToEnd = useCallback(
    (anchor: SimAnchor) => {
      setStartAnchor(anchor);
      requestStartHere(anchor);
    },
    [requestStartHere],
  );

  const confirmPreflight = useCallback(() => {
    if (!startAnchor) return;
    activateSession(startAnchor, preflightInputs);
  }, [activateSession, preflightInputs, startAnchor]);

  const cancelPreflight = useCallback(() => {
    setPreflightOpen(false);
  }, []);

  const scrubTo = useCallback((index: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const clamped = Math.max(0, Math.min(index, prev.steps.length - 1));
      return { ...prev, currentIndex: clamped };
    });
  }, []);

  const stepForward = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.currentIndex >= prev.steps.length - 1) return prev;
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  const stepBack = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.currentIndex <= 0) return prev;
      return { ...prev, currentIndex: prev.currentIndex - 1 };
    });
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    if (!playing || !session) {
      window.clearInterval(playLoopRef.current);
      return;
    }

    // The static walk is a finite statement list (no loop expansion), so play
    // just advances one recorded step per tick and stops at the last one.
    playLoopRef.current = window.setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.currentIndex >= prev.steps.length - 1) {
          setPlaying(false);
          return prev;
        }
        return { ...prev, currentIndex: prev.currentIndex + 1 };
      });
    }, PLAY_INTERVAL_MS / playbackSpeed);

    return () => window.clearInterval(playLoopRef.current);
  }, [playing, playbackSpeed, session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && simActive) exitSimulation();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitSimulation, simActive]);

  const currentScope = useMemo(() => {
    if (!session) return new Map<string, SimValue>();
    return session.steps[session.currentIndex]?.scopeSnapshot ?? new Map();
  }, [session]);

  const value = useMemo(
    () => ({
      simActive,
      panelOpen,
      setPanelOpen,
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
      requestStartHere,
      requestEndHere,
      runStartToEnd,
      confirmPreflight,
      cancelPreflight,
      stepForward,
      stepBack,
      togglePlay,
      scrubTo,
      exitSimulation,
      currentScope,
    }),
    [
      simActive,
      panelOpen,
      session,
      playbackSpeed,
      playing,
      preflightOpen,
      preflightInputs,
      startAnchor,
      endAnchor,
      requestStartHere,
      requestEndHere,
      runStartToEnd,
      confirmPreflight,
      cancelPreflight,
      stepForward,
      stepBack,
      togglePlay,
      scrubTo,
      exitSimulation,
      currentScope,
    ],
  );

  return (
    <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within SimulationProvider");
  }
  return ctx;
}

export function useSimulationOptional(): SimulationContextValue | null {
  return useContext(SimulationContext);
}
