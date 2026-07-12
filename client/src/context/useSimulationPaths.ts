import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  defaultPathLabel,
  deleteSimTracePath,
  duplicateSimTracePath,
  loadSimTracePaths,
  saveSimTracePath,
  type SimTracePath,
} from "@/lib/simTracePaths";
import { effectiveEndFileLine } from "@/lib/simTraceBounds";
import type { LineAnchor, SimAnchor } from "@/context/simulationTypes";
import type { SimPanelTab } from "@/lib/staticWalk/types";

type PathsArgs = {
  startAnchor: SimAnchor | null;
  endAnchor: LineAnchor | null;
  preflightInputs: Record<string, string>;
  setStartAnchor: React.Dispatch<React.SetStateAction<SimAnchor | null>>;
  setEndAnchor: React.Dispatch<React.SetStateAction<LineAnchor | null>>;
  setPreflightInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSavedPaths: React.Dispatch<React.SetStateAction<SimTracePath[]>>;
  setPanelOpen: (open: boolean) => void;
  setPanelTab: (tab: SimPanelTab) => void;
  activateSession: (
    anchor: SimAnchor,
    inputs: Record<string, string>,
    end?: LineAnchor | null,
  ) => void;
};

export function useSimulationPaths({
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
}: PathsArgs) {
  const { getNode } = useReactFlow();

  const refreshSavedPaths = useCallback(() => {
    setSavedPaths(loadSimTracePaths());
  }, [setSavedPaths]);

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
    [endAnchor, preflightInputs, refreshSavedPaths, setPanelTab, startAnchor],
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
    [activateSession, getNode, setEndAnchor, setPreflightInputs, setStartAnchor],
  );

  const loadPathDraft = useCallback(
    (path: SimTracePath) => {
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
    },
    [setEndAnchor, setPanelOpen, setPanelTab, setPreflightInputs, setStartAnchor],
  );

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

  return {
    refreshSavedPaths,
    saveCurrentPath,
    runSavedPath,
    loadPathDraft,
    removeSavedPath,
    duplicateSavedPath,
  };
}
