import { graphPane } from "@/lib/graphPaneDom";

/** Set on the stub host after the first successful fixed-position layout. */
export const LOAD_STUB_READY_ATTR = "data-load-stub-ready";

const NODE_GAP_PX = 20;
const PANE_MARGIN_PX = 8;

export type LoadStubBounds = {
  left: number;
  top: number;
  /** Stub edge the wire connects to — the side that faces the node. */
  socket: "left" | "right";
};

/**
 * Place a load stub beside the hosting class node. Prefers flush-left of the
 * node (wire exits the stub's right edge); when the node hugs the pane's left
 * edge and the stub would spill into the sidebar, it flips to the right of the
 * node (wire exits the left edge). Falls back to clamping inside the pane so the
 * chip is always fully on-canvas, never over the left explorer.
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

  let socket: "left" | "right" = "right";
  let left = anchorRect.left - stubWidth - NODE_GAP_PX;

  if (paneRect) {
    const minLeft = paneRect.left + PANE_MARGIN_PX;
    const maxLeft = paneRect.right - stubWidth - PANE_MARGIN_PX;
    if (left < minLeft) {
      // No room on the left — flip to the right of the node if it fits there.
      const rightLeft = anchorRect.right + NODE_GAP_PX;
      if (rightLeft <= maxLeft) {
        left = rightLeft;
        socket = "left";
      } else {
        left = Math.max(minLeft, Math.min(left, maxLeft));
      }
    }
  }

  let top = toRect.top + toRect.height / 2 - stubHeight / 2;
  if (paneRect) {
    const minTop = paneRect.top + PANE_MARGIN_PX;
    const maxTop = paneRect.bottom - stubHeight - PANE_MARGIN_PX;
    top = Math.max(minTop, Math.min(top, maxTop));
  }

  return { left, top, socket };
}
