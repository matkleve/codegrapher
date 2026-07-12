import { graphPane } from "@/lib/graphPaneDom";

/** Set on the stub host after the first successful fixed-position layout. */
export const LOAD_STUB_READY_ATTR = "data-load-stub-ready";

const NODE_GAP_PX = 20;
const PANE_MARGIN_PX = 8;

export type LoadStubBounds = {
  left: number;
  top: number;
};

/**
 * Place a load stub flush left of the hosting class node.
 * Returns viewport coordinates for `position: fixed` — never pane-relative,
 * so the chip hugs the node even when that means partial off-canvas clip.
 */
export function loadStubPanePosition(
  toEl: HTMLElement,
  stubWidth: number,
  stubHeight: number,
): LoadStubBounds | null {
  if (!toEl.isConnected) return null;

  const pane = graphPane();
  const paneRect = pane?.getBoundingClientRect();

  const toRect = toEl.getBoundingClientRect();
  const nodeEl = toEl.closest<HTMLElement>(".react-flow__node");
  const anchorRect = nodeEl?.getBoundingClientRect() ?? toRect;

  const left = anchorRect.left - stubWidth - NODE_GAP_PX;
  let top = toRect.top + toRect.height / 2 - stubHeight / 2;

  if (paneRect) {
    const minTop = paneRect.top + PANE_MARGIN_PX;
    const maxTop = paneRect.bottom - stubHeight - PANE_MARGIN_PX;
    top = Math.max(minTop, Math.min(top, maxTop));
  }

  return { left, top };
}
