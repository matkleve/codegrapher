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
import { buildStepDetail } from "@/lib/staticWalk/buildStepDetail";
import { extractParamNames, scopeAtStep } from "@/lib/staticWalk/scopeAtStep";
import { previewLineHandle, previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { AnchorRef } from "@/lib/previewEdgeTypes";
import {
  defaultPathLabel,
  deleteSimTracePath,
  duplicateSimTracePath,
  loadSimTracePaths,
  saveSimTracePath,
  type SimTracePath,
} from "@/lib/simTracePaths";
import { enrichSimSteps } from "@/lib/enrichSimSteps";
import { effectiveEndFileLine, isFileLineInTraceRange } from "@/lib/simTraceBounds";
import type {
  PlaybackSpeed,
  SimPanelTab,
  SimSession,
  SimStep,
  SimValue,
} from "@/lib/staticWalk/types";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";

export type SimAnchor = {
  flowNodeId: string;
  memberId: string;
  methodName: string;
  code: string;
  signatureLine: string;
  filePath: string;
  /** File-absolute line of `code`'s first line (parser method start). */
  methodStartLine: number;
  /** File-absolute line the trace starts on (gutter/context click). */
  startLine: number;
  endLine?: number;
};

type LineAnchor = { memberId: string; line: number };

type SimulationContextValue = {
  simActive: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  panelTab: SimPanelTab;
  setPanelTab: (tab: SimPanelTab) => void;
  session: SimSession | null;
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  playing: boolean;
  preflightOpen: boolean;
  preflightInputs: Record<string, string>;
  setPreflightInput: (name: string, value: string) => void;
  startAnchor: SimAnchor | null;
  endAnchor: LineAnchor | null;
  savedPaths: SimTracePath[];
  ledgerExpanded: Set<number>;
  toggleLedgerRow: (index: number) => void;
  requestStartHere: (anchor: SimAnchor) => void;
  armStartHere: (anchor: SimAnchor) => void;
  toggleEndHere: (line: number, memberId: string) => void;
  gutterRunRange: (endLine: number, memberId: string) => void;
  requestEndHere: (line: number, memberId: string) => void;
  runStartToEnd: (anchor: SimAnchor) => void;
  confirmPreflight: () => void;
  cancelPreflight: () => void;
  applyInputs: () => void;
  saveCurrentPath: (label?: string) => void;
  runSavedPath: (path: SimTracePath) => void;
  removeSavedPath: (id: string) => void;
  duplicateSavedPath: (id: string) => void;
  loadPathDraft: (path: SimTracePath) => void;
  refreshSavedPaths: () => void;
  stepForward: () => void;
  stepBack: () => void;
  togglePlay: () => void;
  scrubTo: (index: number) => void;
  exitSimulation: () => void;
  disarmTrace: () => void;
  stopAndClear: () => void;
  effectiveEndLine: number | null;
  traceRangeLabel: (startLine: number, endLine: number, implicitEnd: boolean) => string;
  currentScope: Map<string, SimValue>;
  isLineInSimRange: (memberId: string, lineNumber: number) => boolean;
  lineGutterRole: (
    memberId: string,
    lineNumber: number,
  ) => "start" | "end" | "current" | null;
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

const PLAY_INTERVAL_MS = 600;

function buildSession(
  anchor: SimAnchor,
  inputs: Record<string, string>,
  endLine: number,
): SimSession {
  // The static-walk engine works in *code-relative* line numbers (1 = first
  // line of `code`), but the gutter, CodeLine, and preview handles use
  // *file-absolute* lines. Convert at this boundary: feed code-relative lines
  // to the engine, emit file-absolute lines to the UI. `methodStartLine` is the
  // file line of `code`'s first line, so file = rel + base - 1.
  const base = anchor.methodStartLine;
  const toRel = (fileLine: number): number => fileLine - base + 1;
  const toFile = (relLine: number): number => relLine + base - 1;

  const parsed = buildStepList(anchor.code, toRel(anchor.startLine), toRel(endLine));
  const paramNames = extractParamNames(anchor.signatureLine);
  const steps: SimStep[] = parsed.map((stmt) => ({
    lineNumber: toFile(stmt.lineNumber),
    text: stmt.text,
    kind: stmt.kind,
    scopeSnapshot: scopeAtStep(anchor.code, stmt.lineNumber, inputs, paramNames),
    detail: buildStepDetail(
      anchor.code,
      stmt.lineNumber,
      stmt.text,
      stmt.kind,
      inputs,
      paramNames,
    ),
    edgePulse:
      stmt.kind === "call" || stmt.kind === "return"
        ? { fromLine: toFile(stmt.lineNumber), token: stmt.text.match(/(\w+)\s*\(/)?.[1] }
        : undefined,
  }));

  return {
    flowNodeId: anchor.flowNodeId,
    memberId: anchor.memberId,
    methodName: anchor.methodName,
    filePath: anchor.filePath,
    startLine: anchor.startLine,
    endLine,
    inputs,
    steps,
    currentIndex: 0,
  };
}

function initPreflightInputs(
  signatureLine: string,
  prev: Record<string, string>,
): Record<string, string> {
  const params = extractParamNames(signatureLine);
  const next = { ...prev };
  for (const p of params) {
    if (!(p in next)) next[p] = "";
  }
  return next;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { setPulseEdges, graphData } = useGraphInteraction();
  const { symbols } = useIndex();
  const { getNode } = useReactFlow();
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
  const [savedPaths, setSavedPaths] = useState<SimTracePath[]>(() => loadSimTracePaths());
  const [ledgerExpanded, setLedgerExpanded] = useState<Set<number>>(() => new Set());
  const playLoopRef = useRef(0);

  const refreshSavedPaths = useCallback(() => {
    setSavedPaths(loadSimTracePaths());
  }, []);

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
    if (simActive) setPanelTab("run");
  }, [simActive]);

  const exitSimulation = useCallback(() => {
    setPlaying(false);
    setSimActive(false);
    setSession(null);
    setPreflightOpen(false);
    setLedgerExpanded(new Set());
    setPulseEdges([]);
    window.clearInterval(playLoopRef.current);
  }, [setPulseEdges]);

  const disarmTrace = useCallback(() => {
    exitSimulation();
    setStartAnchor(null);
    setEndAnchor(null);
  }, [exitSimulation]);

  const stopAndClear = useCallback(() => {
    disarmTrace();
  }, [disarmTrace]);

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
    [endAnchor, getNode, graphData, symbols],
  );

  const armStartHere = useCallback((anchor: SimAnchor) => {
    setStartAnchor(anchor);
    setEndAnchor((prev) => (prev && prev.memberId !== anchor.memberId ? null : prev));
    setPanelOpen(true);
    setPanelTab("inputs");
    setPreflightInputs((prev) => initPreflightInputs(anchor.signatureLine, prev));
  }, []);

  const requestStartHere = useCallback((anchor: SimAnchor) => {
    armStartHere(anchor);
    setPreflightOpen(true);
  }, [armStartHere]);

  const toggleEndHere = useCallback((line: number, memberId: string) => {
    setEndAnchor((prev) =>
      prev?.line === line && prev.memberId === memberId ? null : { line, memberId },
    );
  }, []);

  const requestEndHere = useCallback((line: number, memberId: string) => {
    setEndAnchor({ line, memberId });
  }, []);

  const gutterRunRange = useCallback(
    (endLine: number, memberId: string) => {
      if (!startAnchor || startAnchor.memberId !== memberId) return;
      setEndAnchor({ line: endLine, memberId });
      setPreflightOpen(true);
    },
    [startAnchor],
  );

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
  }, [preflightInputs, session, simActive, startAnchor, symbols, graphData, getNode]);

  const saveCurrentPath = useCallback(
    (label?: string) => {
      if (!startAnchor) return;
      const explicitEnd =
        endAnchor?.memberId === startAnchor.memberId ? endAnchor : null;
      saveSimTracePath({
        label:
          label ??
          defaultPathLabel(
            startAnchor.methodName,
            startAnchor.startLine,
            effectiveEndFileLine(startAnchor, explicitEnd),
          ),
        flowNodeId: startAnchor.flowNodeId,
        memberId: startAnchor.memberId,
        methodName: startAnchor.methodName,
        filePath: startAnchor.filePath,
        code: startAnchor.code,
        signatureLine: startAnchor.signatureLine,
        methodStartLine: startAnchor.methodStartLine,
        startLine: startAnchor.startLine,
        endLine: explicitEnd?.line,
        inputs: { ...preflightInputs },
      });
      refreshSavedPaths();
      setPanelTab("paths");
    },
    [endAnchor, preflightInputs, refreshSavedPaths, startAnchor],
  );

  const runSavedPath = useCallback(
    (path: SimTracePath) => {
      if (!getNode(path.flowNodeId)) {
        window.alert(`${path.methodName}: node is not on the canvas. Load the file first.`);
        return;
      }
      if (path.methodStartLine == null || Number.isNaN(path.methodStartLine)) {
        window.alert(
          `${path.label}: saved path is missing method metadata — re-save from the canvas.`,
        );
        return;
      }
      const anchor: SimAnchor = {
        flowNodeId: path.flowNodeId,
        memberId: path.memberId,
        methodName: path.methodName,
        code: path.code,
        signatureLine: path.signatureLine,
        filePath: path.filePath,
        methodStartLine: path.methodStartLine,
        startLine: path.startLine,
      };
      setStartAnchor(anchor);
      setPreflightInputs(path.inputs);
      if (path.endLine != null) {
        setEndAnchor({ memberId: path.memberId, line: path.endLine });
      }
      activateSession(
        anchor,
        path.inputs,
        path.endLine != null ? { memberId: path.memberId, line: path.endLine } : null,
      );
    },
    [activateSession, getNode],
  );

  const loadPathDraft = useCallback((path: SimTracePath) => {
    setStartAnchor({
      flowNodeId: path.flowNodeId,
      memberId: path.memberId,
      methodName: path.methodName,
      code: path.code,
      signatureLine: path.signatureLine,
      filePath: path.filePath,
      methodStartLine: path.methodStartLine,
      startLine: path.startLine,
    });
    setPreflightInputs(path.inputs);
    if (path.endLine != null) {
      setEndAnchor({ memberId: path.memberId, line: path.endLine });
    }
    setPanelTab("inputs");
    setPanelOpen(true);
  }, []);

  const removeSavedPath = useCallback(
    (id: string) => {
      deleteSimTracePath(id);
      refreshSavedPaths();
    },
    [refreshSavedPaths],
  );

  const duplicateSavedPath = useCallback(
    (id: string) => {
      duplicateSimTracePath(id);
      refreshSavedPaths();
    },
    [refreshSavedPaths],
  );

  const toggleLedgerRow = useCallback((index: number) => {
    setLedgerExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
      if (e.key !== "Escape") return;
      if (simActive) {
        exitSimulation();
        return;
      }
      if (startAnchor) disarmTrace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disarmTrace, exitSimulation, simActive, startAnchor]);

  const currentScope = useMemo(() => {
    if (!session) return new Map<string, SimValue>();
    return session.steps[session.currentIndex]?.scopeSnapshot ?? new Map();
  }, [session]);

  const isLineInSimRange = useCallback(
    (memberId: string, lineNumber: number) => {
      if (!startAnchor) return false;
      return isFileLineInTraceRange(startAnchor, endAnchor, memberId, lineNumber);
    },
    [endAnchor, startAnchor],
  );

  const effectiveEndLine = useMemo(() => {
    if (!startAnchor) return null;
    return effectiveEndFileLine(startAnchor, endAnchor);
  }, [endAnchor, startAnchor]);

  const traceRangeLabel = useCallback(
    (startLine: number, endLine: number, implicitEnd: boolean) =>
      startLine === endLine
        ? `L${startLine}`
        : `L${startLine}→L${endLine}${implicitEnd ? " (method end)" : ""}`,
    [],
  );

  const lineGutterRole = useCallback(
    (memberId: string, lineNumber: number): "start" | "end" | "current" | null => {
      if (
        simActive &&
        session?.memberId === memberId &&
        session.steps[session.currentIndex]?.lineNumber === lineNumber
      ) {
        return "current";
      }
      if (simActive) return null;
      if (startAnchor?.memberId === memberId && startAnchor.startLine === lineNumber) {
        return "start";
      }
      if (endAnchor?.memberId === memberId && endAnchor.line === lineNumber) {
        return "end";
      }
      return null;
    },
    [endAnchor, session, simActive, startAnchor],
  );

  const value = useMemo(
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
      savedPaths,
      ledgerExpanded,
      toggleLedgerRow,
      requestStartHere,
      armStartHere,
      toggleEndHere,
      gutterRunRange,
      requestEndHere,
      runStartToEnd,
      confirmPreflight,
      cancelPreflight,
      applyInputs,
      saveCurrentPath,
      runSavedPath,
      removeSavedPath,
      duplicateSavedPath,
      loadPathDraft,
      refreshSavedPaths,
      stepForward,
      stepBack,
      togglePlay,
      scrubTo,
      exitSimulation,
      disarmTrace,
      stopAndClear,
      effectiveEndLine,
      traceRangeLabel,
      currentScope,
      isLineInSimRange,
      lineGutterRole,
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
      savedPaths,
      ledgerExpanded,
      toggleLedgerRow,
      requestStartHere,
      armStartHere,
      toggleEndHere,
      gutterRunRange,
      requestEndHere,
      runStartToEnd,
      confirmPreflight,
      cancelPreflight,
      applyInputs,
      saveCurrentPath,
      runSavedPath,
      removeSavedPath,
      duplicateSavedPath,
      loadPathDraft,
      refreshSavedPaths,
      stepForward,
      stepBack,
      togglePlay,
      scrubTo,
      exitSimulation,
      disarmTrace,
      stopAndClear,
      effectiveEndLine,
      traceRangeLabel,
      currentScope,
      isLineInSimRange,
      lineGutterRole,
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
