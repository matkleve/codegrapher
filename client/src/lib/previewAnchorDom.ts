import type { AnchorRef } from "@/lib/previewEdgeTypes";
import { getByHandle } from "@/lib/elementRegistry";

function isFinitePoint(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y);
}

function guardAnchor(anchor: ResolvedAnchor | null): ResolvedAnchor | null {
  if (!anchor || !isFinitePoint(anchor.x, anchor.y)) return null;
  return anchor;
}

export type ResolvedAnchor = {
  x: number;
  y: number;
  side: "left" | "right";
  el: HTMLElement | null;
  token?: string;
  kind?: string;
};

export type EndpointRole = "from" | "to";

const ANCHOR_OUTSET = 9;
const CHIP_DOT_DIAMETER = 4;
const CHIP_DOT_GAP = 4;

function sideForEndpoint(role: EndpointRole): "left" | "right" {
  return role === "from" ? "right" : "left";
}

function findTargetAnchor(
  handleId: string,
  side: "left" | "right",
): HTMLElement | null {
  const fromRegistry = getByHandle(handleId, side);
  if (fromRegistry) return fromRegistry;

  return document.querySelector<HTMLElement>(
    `[data-flow-anchor-target="${CSS.escape(handleId)}"][data-flow-anchor="${side}"]`,
  );
}

function flowAnchorVisible(dot: HTMLElement | null): boolean {
  return Boolean(dot?.isConnected && dot.classList.contains("flow-anchor-on"));
}

function syntheticChipAnchor(
  chipRect: DOMRect,
  side: "left" | "right",
  svgBox: DOMRect,
): { x: number; y: number } {
  const inset = CHIP_DOT_GAP + CHIP_DOT_DIAMETER / 2;
  return {
    x:
      (side === "right" ? chipRect.right + inset : chipRect.left - inset) -
      svgBox.left,
    y: chipRect.top + chipRect.height / 2 - svgBox.top,
  };
}

function elementAnchor(
  el: HTMLElement,
  side: "left" | "right",
  box: DOMRect,
): ResolvedAnchor | null {
  const chipRect = el.getBoundingClientRect();
  // A connected-but-zero-size rect (collapsed member row, mid-unmount) would
  // otherwise resolve to ≈ (-box.left, -box.top) and snap the wire to the
  // overlay's top-left corner. Treat it as unresolvable so the wire hides.
  if (chipRect.width === 0 && chipRect.height === 0) return null;
  const dot = el.querySelector<HTMLElement>(`[data-flow-anchor="${side}"]`);
  if (dot && flowAnchorVisible(dot)) {
    const rect = dot.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return guardAnchor({
        x: rect.left + rect.width / 2 - box.left,
        y: rect.top + rect.height / 2 - box.top,
        side,
        el,
        token: el.dataset.symbolName,
      });
    }
  }

  if (dot?.isConnected) {
    const pt = syntheticChipAnchor(chipRect, side, box);
    return guardAnchor({ x: pt.x, y: pt.y, side, el, token: el.dataset.symbolName });
  }

  const x =
    (side === "right" ? chipRect.right : chipRect.left) -
    box.left +
    (side === "right" ? ANCHOR_OUTSET : -ANCHOR_OUTSET);
  const y = chipRect.top + chipRect.height / 2 - box.top;
  return guardAnchor({ x, y, side, el, token: el.dataset.symbolName });
}

/** Port sides for sig-type → param typesetting — type exits right, param enters left. */
export function typesettingPortSides(
  _fromX: number,
  _toX: number,
): { fromSide: "right"; toSide: "left" } {
  return { fromSide: "right", toSide: "left" };
}

/** Typesetting anchors on type right / param left; above-line route spans the signature row. */
export function resolveTypesettingAnchors(
  fromRef: AnchorRef,
  toRef: AnchorRef,
  svgBox: DOMRect,
): { fromPt: ResolvedAnchor; toPt: ResolvedAnchor } | null {
  const roughFrom = resolvePreviewAnchor(fromRef, svgBox, "from");
  const roughTo = resolvePreviewAnchor(toRef, svgBox, "to");
  if (!roughFrom || !roughTo) return null;
  if (!roughFrom.el || !roughTo.el) {
    return { fromPt: roughFrom, toPt: roughTo };
  }

  const sides = typesettingPortSides(roughFrom.x, roughTo.x);
  const fromPt = resolvePreviewAnchor(
    { type: "element", el: roughFrom.el, side: sides.fromSide },
    svgBox,
    "from",
  );
  const toPt = resolvePreviewAnchor(
    { type: "element", el: roughTo.el, side: sides.toSide },
    svgBox,
    "to",
  );
  if (!fromPt || !toPt) return null;
  return { fromPt, toPt };
}

export function resolvePreviewAnchor(
  ref: AnchorRef,
  svgBox: DOMRect,
  role: EndpointRole,
): ResolvedAnchor | null {
  const side = sideForEndpoint(role);

  if (ref.type === "element") {
    if (!ref.el.isConnected) return null;
    const side = ref.side ?? sideForEndpoint(role);
    return elementAnchor(ref.el, side, svgBox);
  }

  const anchor =
    findTargetAnchor(ref.handle, side) ??
    findTargetAnchor(ref.handle, side === "right" ? "left" : "right");
  if (!anchor?.isConnected) return null;

  const rect = anchor.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const anchorSide = anchor.getAttribute("data-flow-anchor") as "left" | "right";
  const x = rect.left + rect.width / 2 - svgBox.left;
  const y = rect.top + rect.height / 2 - svgBox.top;
  return guardAnchor({ x, y, side: anchorSide ?? side, el: anchor });
}

/** Bend distance for shallow wires — scales with chip height between endpoints. */
export function chipClearance(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
): number {
  let maxH = 20;
  for (const el of [fromEl, toEl]) {
    if (!el?.isConnected) continue;
    maxH = Math.max(maxH, el.getBoundingClientRect().height);
  }
  return Math.ceil(maxH / 2) + 12;
}

export function laneOffsetFromEdgeId(edgeId: string): number {
  const match = edgeId.match(/-(\d+)$/);
  if (!match) return 0;
  const index = Number(match[1]);
  if (!Number.isFinite(index)) return 0;
  return (index % 3) - 1;
}
