import type { GutterAction, LineMarker } from "@/lib/simGutterActions";
import type {
  PlaybackSpeed,
  SimPanelTab,
  SimSession,
  SimValue,
} from "@/lib/staticWalk/types";
import type { SimTracePath } from "@/lib/simTracePaths";
import type { FlowSubstep } from "@/lib/staticWalk/buildStepFlow";

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

export type LineAnchor = LineMarker;

export type SimulationContextValue = {
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
  pauseAnchors: LineAnchor[];
  savedPaths: SimTracePath[];
  ledgerExpanded: Set<number>;
  toggleLedgerRow: (index: number) => void;
  requestStartHere: (anchor: SimAnchor) => void;
  armStartHere: (anchor: SimAnchor) => void;
  applyGutterAction: (action: GutterAction, anchor: SimAnchor, line: number, memberId: string) => void;
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
  ) => "start" | "end" | "pause" | "current" | null;
  gutterAnchorState: { start: { memberId: string; startLine: number } | null; end: LineAnchor | null };
  hasExplicitTraceEnd: boolean;
  /** Current statement's expression flow graph — see canvas-values supplement (C3). */
  flowSubsteps: FlowSubstep[];
  /** How many of `flowSubsteps` have completed auto-playing. */
  substepIndex: number;
  /** True once auto-play has finished (or there is nothing to play). */
  substepsSettled: boolean;
  /** Current step has a binding but an undecomposable RHS — C-alt shimmer applies. */
  substepUndecomposable: boolean;
  /** C-alt only: false while the fallback line shimmers, true once it "lights". */
  substepFallbackLit: boolean;
  /** C-alt only: shimmer cycle length in ms — slower while awaiting a call. */
  substepFallbackShimmerMs: number;
};
