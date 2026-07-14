import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { TokenInfoState } from "@/lib/tokenContextInfo";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { ReadingFocus } from "@/lib/graphReadingFocus";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { ConnectionKind } from "@/lib/structuralEdgeColors";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { TokenConnectionMenuState } from "@/lib/connectionMenu";
import type { CallSiteReference } from "@/lib/projectReferences";
import type { PinnedTrace } from "@/lib/pinnedTraces";
import type { TokenReference } from "@/lib/semanticLookup";
import type { TraceEvent } from "@/lib/traceSession";
import type { GraphData, ReferenceEntry } from "@/types";

export type { PreviewEdgeSpec, AnchorRef } from "@/lib/previewEdgeTypes";
export { edgeTouchesHandle, refinePreviewEdge } from "@/lib/resolveLiveAnchor";
export type { TokenInfoState };

export type AnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function toAnchorRect(rect: DOMRect): AnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Identity-stable slice: callbacks, lookups, and load-invariant data. None of
 * these change on hover, so consumers that only read actions never re-render
 * during a trace. Lives in its own context (`useGraphActions`) — see
 * `token-hover.atlas.supplement.md` § "why the context is split".
 */
export type GraphActionsValue = {
  toggleEdgeKind: (kind: ConnectionKind) => void;
  setPulseEdges: React.Dispatch<React.SetStateAction<StructuralEdgeSpec[]>>;
  transitiveHopDepth: number;
  beginTrace: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  emitWireSignal: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  endTrace: () => void;
  endHoverPreview: () => void;
  scheduleHoverFire: (
    tokenKey: string,
    onFire: () => void,
    onClear: () => void,
    onInfo?: () => void,
    options?: { instant?: boolean; traceHost?: HTMLElement | null; onSignal?: () => void },
  ) => void;
  scheduleHoverClear: (tokenKey: string, onClear: () => void) => void;
  scheduleHoverLeaveGrace: () => void;
  cancelHoverLeaveGrace: () => void;
  showTokenInfo: (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => void;
  clearTokenInfo: () => void;
  findReferences: (token: string) => TokenReference[];
  findCallSites: (token: string) => CallSiteReference[];
  lookupProjectReferences: (token: string) => ReferenceEntry[];
  lookupOffCanvasCallSiteFiles: (token: string) => ReferenceEntry[];
  focusFlowNode: (flowNodeId: string) => void;
  selectReadingFocus: (focus: ReadingFocus | null) => void;
  focusReadingMember: (flowNodeId: string, memberId: string) => void;
  onLoadFile: (filePath: string) => void | Promise<void>;
  refreshLoadTraces: () => void;
  graphData: GraphData | null;
  pinTrace: (tokenKey: string, shiftKey?: boolean, traceHost?: HTMLElement | null) => void;
  setActivePinKey: (tokenKey: string) => void;
  isPinnedTokenKey: (tokenKey: string) => boolean;
  goBackPin: () => void;
  lookupIndexedUsageSites: (
    token: string,
    sourceFlowId: string,
    sourceMemberId?: string,
    anchorLineNumber?: number,
  ) => UsageSiteRecord[];
  showConnectionMenu: (state: TokenConnectionMenuState) => void;
  clearConnectionMenu: () => void;
};

/**
 * Volatile slice: everything that changes as the pointer moves / a trace commits.
 * Reading any of these subscribes a component to per-hover re-renders, so keep
 * hot/multiplied components (code lines, member rows) OFF this context — read it
 * only in small leaf components (the target-anchor dots).
 */
export type GraphTraceStateValue = {
  previewEdges: PreviewEdgeSpec[];
  structuralEdges: StructuralEdgeSpec[];
  pulseEdges: StructuralEdgeSpec[];
  visibleEdgeKinds: ReadonlySet<ConnectionKind>;
  isEdgeKindVisible: (kind: ConnectionKind) => boolean;
  isHandleActive: (handle: string) => boolean;
  edgeKindAtHandle: (handle: string) => SemanticTokenKind | null;
  isWarm: boolean;
  tokenInfo: TokenInfoState;
  isTraceActive: boolean;
  pinnedTokenKey: string | null;
  pinnedTraces: PinnedTrace[];
  activePinKey: string | null;
  hoveredTokenKey: string | null;
  /** Pointer under cursor — may lead committed trace; updates before dwell. */
  emphasisTokenKey: string | null;
  traceTokenKey: string | null;
  sessionMood?: string;
  debugEvents?: TraceEvent[];
  canGoBackPin: boolean;
  connectionMenu: TokenConnectionMenuState | null;
};

/** Combined view — back-compat for consumers that read both slices at once. */
export type GraphInteractionContextValue = GraphActionsValue & GraphTraceStateValue;
