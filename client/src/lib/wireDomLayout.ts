import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import {
  resolvePreviewAnchor,
  resolveTypesettingAnchors,
  wireHitMidSegment,
  wireHitSegment,
} from "@/lib/resolvePreviewAnchor";
import type { PreviewEdgeJunction } from "@/lib/previewEdgeJunction";
import { branchJunctionPoint, previewWirePath } from "@/lib/wirePaths";
import { getWireLayoutContext } from "@/lib/wireFanLayout";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { previewWireStroke } from "@/lib/connectionWireStyle";
import { isWireRevealing } from "@/lib/wireReveal";
import {
  hideWireUntilReveal,
  loadStubAnchorReady,
  revealWireIfReady,
  setWireJunction,
  type WireElements,
} from "@/lib/wireDomCreate";
import type { Node } from "@xyflow/react";

export type FanWireLayout = {
  pathD: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  drawHitFrom: boolean;
  drawTrunkClass: boolean;
  junction: PreviewEdgeJunction | null;
};

export function applyFanWireLayout(wire: WireElements, layout: FanWireLayout, stroke: string): void {
  wire.path.setAttribute("d", layout.pathD);
  wire.glow.setAttribute("d", layout.pathD);
  wire.path.classList.toggle("preview-edge-fan-trunk", layout.drawTrunkClass);
  wire.glow.classList.toggle("preview-edge-fan-trunk", layout.drawTrunkClass);
  wire.hitFrom.setAttribute(
    "d",
    layout.drawHitFrom
      ? wireHitSegment(layout.fromX, layout.fromY, layout.toX, layout.toY, "from")
      : "",
  );
  wire.hitTo.setAttribute(
    "d",
    wireHitSegment(layout.fromX, layout.fromY, layout.toX, layout.toY, "to"),
  );
  wire.hitMid.setAttribute(
    "d",
    wireHitMidSegment(layout.fromX, layout.fromY, layout.toX, layout.toY),
  );
  setWireJunction(wire, layout.junction, stroke);
}

export function updateWireGeometry(
  wire: WireElements,
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
  allSpecs: PreviewEdgeSpec[] = [],
): boolean {
  if (isWireRevealing(wire.group)) {
    return wire.group.style.display !== "none";
  }

  const spec = wire.spec;
  const stroke = previewWireStroke(spec);
  const layoutCtx = getWireLayoutContext(allSpecs, svgBox, getNode);
  const fanLayout = layoutCtx.fanMembers.get(spec.id);

  if (spec.load) {
    const loadEl = document.querySelector<HTMLElement>(
      `[data-load-edge-id="${CSS.escape(spec.id)}"]`,
    );
    const { to } = refinePreviewEdge(spec, getNode);
    const toPt = resolvePreviewAnchor(to, svgBox, "to");
    if (!loadEl?.isConnected || !toPt) {
      wire.group.style.display = "none";
      return false;
    }
    if (!loadStubAnchorReady(loadEl)) {
      wire.group.style.display = "none";
      return false;
    }

    const fromSide =
      (loadEl.dataset.loadSocket as "left" | "right" | undefined) ?? "right";
    const fromPt = resolvePreviewAnchor(
      { type: "element", el: loadEl, side: fromSide },
      svgBox,
      "from",
    );
    if (!fromPt) {
      wire.group.style.display = "none";
      return false;
    }

    wire.group.style.display = "";
    const lane = layoutCtx.lanes.get(spec.id) ?? 0;
    const pathD = previewWirePath({
      connectionKind: spec.connectionKind,
      x1: fromPt.x,
      y1: fromPt.y,
      x2: toPt.x,
      y2: toPt.y,
      fromSide: fromPt.side,
      toSide: toPt.side,
      fromEl: fromPt.el,
      toEl: toPt.el,
      svgBox,
      lane,
    });
    wire.path.setAttribute("d", pathD);
    wire.glow.setAttribute("d", pathD);
    const fullHit = Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y);
    wire.hitFrom.setAttribute(
      "d",
      wireHitSegment(fromPt.x, fromPt.y, toPt.x, toPt.y, "from", fullHit),
    );
    wire.hitTo.setAttribute(
      "d",
      wireHitSegment(fromPt.x, fromPt.y, toPt.x, toPt.y, "to", fullHit),
    );
    wire.hitMid.setAttribute(
      "d",
      wireHitMidSegment(fromPt.x, fromPt.y, toPt.x, toPt.y),
    );
    setWireJunction(wire, null, stroke);
    hideWireUntilReveal(wire);
    revealWireIfReady(wire, loadEl);
    return true;
  }

  if (fanLayout) {
    wire.group.style.display = "";
    applyFanWireLayout(wire, fanLayout, stroke);
    hideWireUntilReveal(wire);
    revealWireIfReady(wire);
    return true;
  }

  const { from, to } = refinePreviewEdge(wire.spec, getNode);
  const anchorPair =
    spec.connectionKind === "typesetting"
      ? resolveTypesettingAnchors(from, to, svgBox)
      : null;
  const fromPt =
    anchorPair?.fromPt ?? resolvePreviewAnchor(from, svgBox, "from");
  const toPt = anchorPair?.toPt ?? resolvePreviewAnchor(to, svgBox, "to");
  if (!fromPt || !toPt) {
    wire.group.style.display = "none";
    return false;
  }

  if (fromPt.el && toPt.el && fromPt.el === toPt.el) {
    wire.group.style.display = "none";
    return false;
  }

  wire.group.style.display = "";

  const lane = layoutCtx.lanes.get(spec.id) ?? 0;
  const pathD = previewWirePath({
    connectionKind: spec.connectionKind,
    x1: fromPt.x,
    y1: fromPt.y,
    x2: toPt.x,
    y2: toPt.y,
    fromSide: fromPt.side,
    toSide: toPt.side,
    fromEl: fromPt.el,
    toEl: toPt.el,
    svgBox,
    lane,
  });
  wire.path.setAttribute("d", pathD);
  wire.glow.setAttribute("d", pathD);
  wire.path.classList.remove("preview-edge-fan-trunk");
  wire.glow.classList.remove("preview-edge-fan-trunk");
  wire.hitFrom.setAttribute(
    "d",
    wireHitSegment(fromPt.x, fromPt.y, toPt.x, toPt.y, "from"),
  );
  wire.hitTo.setAttribute(
    "d",
    wireHitSegment(fromPt.x, fromPt.y, toPt.x, toPt.y, "to"),
  );
  wire.hitMid.setAttribute(
    "d",
    wireHitMidSegment(fromPt.x, fromPt.y, toPt.x, toPt.y),
  );

  if (spec.connectionKind === "branch") {
    setWireJunction(
      wire,
      branchJunctionPoint(
        fromPt.x,
        fromPt.y,
        fromPt.el,
        [{ x2: toPt.x, y2: toPt.y, toEl: toPt.el }],
        svgBox,
      ),
      stroke,
    );
  } else {
    setWireJunction(wire, null, stroke);
  }

  hideWireUntilReveal(wire);
  revealWireIfReady(wire);

  return true;
}
