import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { LiveAnchorHint } from "@/lib/previewEdgeTypes";
import { connectionCountForHost } from "@/lib/linksForElement";

/** Context for the docked trace action bar (shown only when pinned). */
export type TokenInfoState = {
  token: string;
  kind: SemanticTokenKind;
  pinned: boolean;
  connectionCount: number;
  definedIn: string;
  filePath: string;
  line: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  role: "definition" | "usage";
} | null;

export function makeTokenInfo(
  fields: Omit<NonNullable<TokenInfoState>, "pinned"> & { pinned: boolean },
): NonNullable<TokenInfoState> {
  return fields;
}

/** Build context-bar payload from a wire jump target element. */
export function makeTokenInfoFromJumpTarget(
  el: HTMLElement,
  hint: LiveAnchorHint | undefined,
  kind: SemanticTokenKind,
  pinned: boolean,
): NonNullable<TokenInfoState> {
  const host =
    el.closest<HTMLElement>("[data-flow-node-id]") ?? el;
  const token =
    el.dataset.symbolName ?? hint?.token ?? el.textContent?.trim() ?? "";
  const role =
    el.dataset.symbolRole === "definition" || hint?.role === "definition"
      ? "definition"
      : "usage";
  const flowNodeId = host.dataset.flowNodeId ?? hint?.flowNodeId ?? "";
  const graphNodeId = host.dataset.graphNodeId ?? "";
  const filePath = host.dataset.filePath ?? "";
  const definedIn = host.dataset.classLabel ?? "";
  const line = hint?.lineNumber ?? 1;

  return makeTokenInfo({
    token,
    kind,
    pinned,
    connectionCount: connectionCountForHost(el, token),
    definedIn,
    filePath,
    line,
    sourceFlowId: flowNodeId,
    sourceGraphNodeId: graphNodeId,
    role,
  });
}
