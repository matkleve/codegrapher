import { useCallback, useMemo } from "react";
import type { GutterAction } from "@/lib/simGutterActions";
import { effectiveEndFileLine, isFileLineInTraceRange } from "@/lib/simTraceBounds";
import { initPreflightInputs } from "@/context/buildSimSession";
import type { LineAnchor, SimAnchor } from "@/context/simulationTypes";
import type { SimPanelTab } from "@/lib/staticWalk/types";

type AnchorState = {
  startAnchor: SimAnchor | null;
  endAnchor: LineAnchor | null;
  pauseAnchors: LineAnchor[];
  simActive: boolean;
  session: { memberId: string; currentIndex: number; steps: { lineNumber: number }[] } | null;
};

type AnchorSetters = {
  setStartAnchor: React.Dispatch<React.SetStateAction<SimAnchor | null>>;
  setEndAnchor: React.Dispatch<React.SetStateAction<LineAnchor | null>>;
  setPauseAnchors: React.Dispatch<React.SetStateAction<LineAnchor[]>>;
  setPanelOpen: (open: boolean) => void;
  setPanelTab: (tab: SimPanelTab) => void;
  setPreflightInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPreflightOpen: (open: boolean) => void;
};

export function useSimulationAnchors(
  state: AnchorState,
  setters: AnchorSetters,
  requestStartHere: (anchor: SimAnchor) => void,
) {
  const { startAnchor, endAnchor, pauseAnchors, simActive, session } = state;
  const {
    setStartAnchor,
    setEndAnchor,
    setPauseAnchors,
    setPanelOpen,
    setPanelTab,
    setPreflightInputs,
    setPreflightOpen,
  } = setters;

  const armStartHere = useCallback((anchor: SimAnchor) => {
    setStartAnchor(anchor);
    setEndAnchor((prev) => (prev && prev.memberId !== anchor.memberId ? null : prev));
    setPanelOpen(true);
    setPanelTab("inputs");
    setPreflightInputs((prev) => initPreflightInputs(anchor.signatureLine, prev));
  }, [setEndAnchor, setPanelOpen, setPanelTab, setPreflightInputs, setStartAnchor]);

  const toggleEndHere = useCallback((line: number, memberId: string) => {
    setEndAnchor((prev) =>
      prev?.line === line && prev.memberId === memberId ? null : { line, memberId },
    );
  }, [setEndAnchor]);

  const togglePauseHere = useCallback((line: number, memberId: string) => {
    setPauseAnchors((prev) => {
      const exists = prev.some((p) => p.memberId === memberId && p.line === line);
      if (exists) return prev.filter((p) => !(p.memberId === memberId && p.line === line));
      return [...prev, { memberId, line }];
    });
  }, [setPauseAnchors]);

  const applyGutterAction = useCallback(
    (action: GutterAction, anchor: SimAnchor, line: number, memberId: string) => {
      if (action === "start") {
        if (
          startAnchor?.memberId === memberId &&
          startAnchor.startLine === line
        ) {
          setStartAnchor(null);
          setPauseAnchors((prev) => prev.filter((p) => p.memberId !== memberId));
          return;
        }
        setStartAnchor(anchor);
        setEndAnchor((prev) => {
          if (prev && prev.memberId !== memberId) return null;
          if (prev && prev.line < line) return null;
          return prev;
        });
        setPauseAnchors((prev) => prev.filter((p) => p.memberId !== memberId));
        setPanelOpen(true);
        setPanelTab("inputs");
        setPreflightInputs((prev) => initPreflightInputs(anchor.signatureLine, prev));
        return;
      }
      if (action === "end") {
        toggleEndHere(line, memberId);
        setPanelOpen(true);
        setPanelTab("inputs");
        return;
      }
      togglePauseHere(line, memberId);
    },
    [setEndAnchor, setPanelOpen, setPanelTab, setPauseAnchors, setPreflightInputs, setStartAnchor, startAnchor, toggleEndHere, togglePauseHere],
  );

  const requestEndHere = useCallback((line: number, memberId: string) => {
    setEndAnchor({ line, memberId });
    setPanelOpen(true);
    setPanelTab("inputs");
  }, [setEndAnchor, setPanelOpen, setPanelTab]);

  const gutterRunRange = useCallback(
    (endLine: number, memberId: string) => {
      if (!startAnchor || startAnchor.memberId !== memberId) return;
      setEndAnchor({ line: endLine, memberId });
      setPreflightOpen(true);
    },
    [setEndAnchor, setPreflightOpen, startAnchor],
  );

  const runStartToEnd = useCallback(
    (anchor: SimAnchor) => {
      setStartAnchor(anchor);
      requestStartHere(anchor);
    },
    [requestStartHere, setStartAnchor],
  );

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

  const gutterAnchorState = useMemo(
    () => ({
      start: startAnchor
        ? { memberId: startAnchor.memberId, startLine: startAnchor.startLine }
        : null,
      end: endAnchor,
    }),
    [endAnchor, startAnchor],
  );

  const hasExplicitTraceEnd = Boolean(
    startAnchor && endAnchor?.memberId === startAnchor.memberId,
  );

  const lineGutterRole = useCallback(
    (
      memberId: string,
      lineNumber: number,
    ): "start" | "end" | "pause" | "current" | null => {
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
      if (pauseAnchors.some((p) => p.memberId === memberId && p.line === lineNumber)) {
        return "pause";
      }
      return null;
    },
    [endAnchor, pauseAnchors, session, simActive, startAnchor],
  );

  return {
    armStartHere,
    toggleEndHere,
    applyGutterAction,
    requestEndHere,
    gutterRunRange,
    runStartToEnd,
    isLineInSimRange,
    effectiveEndLine,
    traceRangeLabel,
    gutterAnchorState,
    hasExplicitTraceEnd,
    lineGutterRole,
  };
}
