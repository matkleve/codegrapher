import { graphPane } from "@/lib/graphPaneDom";

const NODE_GAP_PX = 20;
const PANE_MARGIN_PX = 8;

export type LoadStubBounds = {
  left: number;
  top: number;
};

/** Place a load stub left of the hosting node; coordinates are relative to `.graph-pane`. */
export function loadStubPanePosition(
  toEl: HTMLElement,
  stubWidth: number,
  stubHeight: number,
): LoadStubBounds | null {
  if (!toEl.isConnected) return null;

  const pane = graphPane();
  const paneRect = pane?.getBoundingClientRect();
  if (!paneRect) return null;

  const toRect = toEl.getBoundingClientRect();
  const nodeEl = toEl.closest<HTMLElement>(".react-flow__node");
  const anchorRect = nodeEl?.getBoundingClientRect() ?? toRect;

  let left = anchorRect.left - stubWidth - NODE_GAP_PX - paneRect.left;
  let top = toRect.top + toRect.height / 2 - stubHeight / 2 - paneRect.top;

  const minTop = PANE_MARGIN_PX;
  const maxTop = paneRect.height - stubHeight - PANE_MARGIN_PX;
  top = Math.max(minTop, Math.min(top, maxTop));

  return { left, top };
}
