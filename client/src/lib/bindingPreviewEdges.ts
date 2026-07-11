import {
  bindingDefForInit,
  bindingInitFor,
  type MemberSymbolIndex,
} from "@/lib/localSymbolLinks";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import { graphPane } from "@/lib/graphPaneDom";
import { findLocalDefElement } from "@/lib/localDefElements";

/** Initializer expression → param/local binding on the declaring line. */
export function buildBindingPreviewEdges(
  host: HTMLElement,
  symbolIndex: MemberSymbolIndex,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
  edgeIdPrefix: string,
): PreviewEdgeSpec[] {
  const pane = graphPane();
  if (!pane) return [];

  const defId = host.dataset.localDefId;
  let fromEl: HTMLElement | null;
  let toEl: HTMLElement | null;

  if (defId) {
    const site = bindingInitFor(symbolIndex, defId);
    if (!site) return [];
    toEl = host;
    const traceKey = makeUsageTokenKey(
      flowNodeId,
      memberId,
      site.lineNumber,
      site.token,
    );
    fromEl = pane.querySelector<HTMLElement>(
      `[data-trace-key="${CSS.escape(traceKey)}"]`,
    );
  } else {
    const targetDefId = bindingDefForInit(symbolIndex, lineNumber, tokenIndex);
    if (!targetDefId) return [];
    fromEl = host;
    toEl = findLocalDefElement(pane, targetDefId);
  }

  if (!fromEl || !toEl || fromEl === toEl) return [];

  return [
    {
      id: `${edgeIdPrefix}-binding`,
      from: { type: "element", el: fromEl },
      to: { type: "element", el: toEl },
      kind: "variable",
      connectionKind: "binding",
    },
  ];
}
