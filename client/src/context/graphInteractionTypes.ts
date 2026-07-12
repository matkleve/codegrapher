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

export type GraphInteractionContextValue = {
  previewEdges: PreviewEdgeSpec[];
  structuralEdges: StructuralEdgeSpec[];
  pulseEdges: StructuralEdgeSpec[];
  visibleEdgeKinds: ReadonlySet<ConnectionKind>;
  isEdgeKindVisible: (kind: ConnectionKind) => boolean;
  toggleEdgeKind: (kind: ConnectionKind) => void;
  setPulseEdges: React.Dispatch<React.SetStateAction<StructuralEdgeSpec[]>>;
  transitiveHopDepth: number;
  isHandleActive: (handle: string) => boolean;
  edgeKindAtHandle: (handle: string) => SemanticTokenKind | null;
  beginTrace: (tokenKey: string, edges: PreviewEdgeSpec[]) => void;
  endTrace: () => void;
  endHoverPreview: () => void;
  isWarm: boolean;
  scheduleHoverFire: (
    tokenKey: string,
    onFire: () => void,
    onClear: () => void,
    onInfo?: () => void,
    options?: { instant?: boolean; traceHost?: HTMLElement | null },
  ) => void;
  scheduleHoverClear: (tokenKey: string, onClear: () => void) => void;
  scheduleHoverLeaveGrace: () => void;
  cancelHoverLeaveGrace: () => void;
  tokenInfo: TokenInfoState;
  showTokenInfo: (info: Omit<TokenInfoState & object, "pinned"> & { pinned: boolean }) => void;
  clearTokenInfo: () => void;
  isTraceActive: boolean;
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
  pinnedTokenKey: string | null;
  pinnedTraces: PinnedTrace[];
  activePinKey: string | null;
  setActivePinKey: (tokenKey: string) => void;
  isPinnedTokenKey: (tokenKey: string) => boolean;
  hoveredTokenKey: string | null;
  /** Pointer under cursor — may lead committed trace; updates before dwell. */
  emphasisTokenKey: string | null;
  traceTokenKey: string | null;
  lookupIndexedUsageSites: (
    token: string,
    sourceFlowId: string,
    sourceMemberId?: string,
    anchorLineNumber?: number,
  ) => UsageSiteRecord[];
  goBackPin: () => void;
  canGoBackPin: boolean;
  connectionMenu: TokenConnectionMenuState | null;
  showConnectionMenu: (state: TokenConnectionMenuState) => void;
  clearConnectionMenu: () => void;
};
