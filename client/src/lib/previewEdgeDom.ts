import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import {
  resolvePreviewAnchor,
  resolveTypesettingAnchors,
  wireHitMidSegment,
  wireHitSegment,
} from "@/lib/resolvePreviewAnchor";
import { junctionChevronPath, type PreviewEdgeJunction } from "@/lib/previewEdgeJunction";
import { branchJunctionPoint, previewWirePath } from "@/lib/wirePaths";
import { getWireLayoutContext } from "@/lib/wireFanLayout";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  previewWireClasses,
  previewWireMarkerEnd,
  previewWireMarkerStart,
  previewWireStroke,
} from "@/lib/connectionWireStyle";
import { depthFromHop, TRACE_GLOW_BASELINE_RATIO, traceWireOpacity } from "@/lib/traceDepth";
import {
  edgeTouchesHoveredToken,
  getWireHoveredTokenKey,
  isTraceSessionActive,
  isWireHovered,
} from "@/lib/wireHoverBoost";
import { playWireReveal } from "@/lib/wireReveal";
import type { Node } from "@xyflow/react";

export type WireElements = {
  spec: PreviewEdgeSpec;
  group: SVGGElement;
  glow: SVGPathElement;
  path: SVGPathElement;
  junction: SVGGElement;
  hitFrom: SVGPathElement;
  hitTo: SVGPathElement;
  hitMid: SVGPathElement;
};

function applyWireMarkers(wire: WireElements, spec: PreviewEdgeSpec): void {
  if (spec.load) {
    wire.path.removeAttribute("marker-end");
    wire.path.removeAttribute("marker-start");
    return;
  }
  const end = previewWireMarkerEnd(spec);
  const start = previewWireMarkerStart(spec);
  if (end) wire.path.setAttribute("marker-end", `url(#${end})`);
  else wire.path.removeAttribute("marker-end");
  if (start) wire.path.setAttribute("marker-start", `url(#${start})`);
  else wire.path.removeAttribute("marker-start");
}

function setWireJunction(
  wire: WireElements,
  junction: PreviewEdgeJunction | null,
  stroke: string,
): void {
  if (!junction) {
    wire.junction.style.display = "none";
    return;
  }
  wire.junction.style.display = "";
  const ring = wire.junction.querySelector<SVGCircleElement>(".preview-edge-junction-ring");
  const chevron = wire.junction.querySelector<SVGPathElement>(".preview-edge-junction-chevron");
  if (!ring || !chevron) return;
  ring.setAttribute("cx", String(junction.x));
  ring.setAttribute("cy", String(junction.y));
  ring.style.stroke = stroke;
  ring.style.fill = stroke;
  chevron.setAttribute("d", junctionChevronPath(junction.x, junction.y, junction.bearing));
  chevron.style.fill = stroke;
}

function applyWireDepthOpacity(
  path: SVGPathElement,
  glow: SVGPathElement,
  spec: PreviewEdgeSpec,
  getNode?: (id: string) => Node | undefined,
): void {
  if (!isTraceSessionActive()) {
    path.style.removeProperty("opacity");
    glow.style.removeProperty("opacity");
    return;
  }

  const depth = depthFromHop(spec.hop);
  const hoverKey = getWireHoveredTokenKey();
  const pointerHover =
    isWireHovered(spec, path) ||
    (getNode != null && edgeTouchesHoveredToken(spec, getNode, hoverKey));

  if (spec.opacity != null && spec.opacity < 1) {
    path.style.opacity = String(spec.opacity);
    glow.style.opacity = String(spec.opacity * TRACE_GLOW_BASELINE_RATIO);
    return;
  }

  const { path: pathOpacity, glow: glowOpacity } = traceWireOpacity(depth, undefined, pointerHover);
  path.style.opacity = String(pathOpacity);
  const group = path.parentElement as SVGGElement | null;
  const revealing =
    group?.dataset.revealStarted === "1" && group?.dataset.revealed !== "1";
  if (!revealing) {
    glow.style.opacity = String(glowOpacity);
  }
  path.classList.toggle("preview-edge-line-hover", pointerHover);
  glow.classList.toggle("preview-edge-line-hover", pointerHover);
}

function revealWireIfReady(wire: WireElements): void {
  const warm = wire.path.classList.contains("preview-edge-warm");
  const stagger = Number.parseInt(wire.group.dataset.drawIndex ?? "0", 10);
  playWireReveal(wire, warm, stagger);
}

export function createWireGroup(
  spec: PreviewEdgeSpec,
  warm: boolean,
): WireElements {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-edge-id", spec.id);

  const { path: pathClasses, glow: glowClasses } = previewWireClasses(spec, warm);

  const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  glow.setAttribute("fill", "none");
  glow.classList.add(...glowClasses);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.classList.add(...pathClasses);
  applyWireDepthOpacity(path, glow, spec);

  const junction = document.createElementNS("http://www.w3.org/2000/svg", "g");
  junction.classList.add("preview-edge-junction");
  junction.style.display = "none";
  const junctionRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  junctionRing.setAttribute("r", "4");
  junctionRing.classList.add("preview-edge-junction-ring");
  const junctionChevron = document.createElementNS("http://www.w3.org/2000/svg", "path");
  junctionChevron.classList.add("preview-edge-junction-chevron");
  junction.append(junctionRing, junctionChevron);

  const hitFrom = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitFrom.setAttribute("fill", "none");
  hitFrom.classList.add("preview-edge-hit", "preview-edge-hit-end");

  const hitTo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitTo.setAttribute("fill", "none");
  hitTo.classList.add("preview-edge-hit", "preview-edge-hit-end");

  const hitMid = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitMid.setAttribute("fill", "none");
  hitMid.classList.add("preview-edge-hit", "preview-edge-hit-mid");

  const stroke = previewWireStroke(spec);
  glow.style.stroke = stroke;
  path.style.stroke = stroke;

  group.append(glow, path, junction, hitFrom, hitTo, hitMid);
  applyWireMarkers({ spec, group, glow, path, junction, hitFrom, hitTo, hitMid }, spec);

  return { spec, group, glow, path, junction, hitFrom, hitTo, hitMid };
}

export function setWireWarm(wire: WireElements, warm: boolean): void {
  wire.glow.classList.toggle("preview-edge-warm", warm);
  wire.path.classList.toggle("preview-edge-warm", warm);
}

type FanWireLayout = {
  pathD: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  drawHitFrom: boolean;
  drawTrunkClass: boolean;
  junction: PreviewEdgeJunction | null;
};

function applyFanWireLayout(wire: WireElements, layout: FanWireLayout, stroke: string): void {
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
    revealWireIfReady(wire);
    return true;
  }

  if (fanLayout) {
    wire.group.style.display = "";
    applyFanWireLayout(wire, fanLayout, stroke);
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

  revealWireIfReady(wire);

  return true;
}

/** Re-apply hop / hover opacity after geometry or hovered token changes. */
export function refreshWireDepthOpacity(
  wires: Map<string, WireElements>,
  getNode: (id: string) => Node | undefined,
): void {
  for (const wire of wires.values()) {
    applyWireDepthOpacity(wire.path, wire.glow, wire.spec, getNode);
  }
}

export function refreshOneWireDepthOpacity(
  wire: WireElements,
  getNode: (id: string) => Node | undefined,
): void {
  applyWireDepthOpacity(wire.path, wire.glow, wire.spec, getNode);
}

export function syncWireDom(
  container: SVGGElement,
  specs: PreviewEdgeSpec[],
  wires: Map<string, WireElements>,
  warm: boolean,
  getNode?: (id: string) => Node | undefined,
): void {
  const nextIds = new Set(specs.map((s) => s.id));

  for (const [id, wire] of wires) {
    if (nextIds.has(id)) continue;
    wire.group.remove();
    wires.delete(id);
  }

  for (const [index, spec] of specs.entries()) {
    let wire = wires.get(spec.id);
    const hadLoad = wire?.spec.load != null;
    const hasLoad = spec.load != null;
    if (wire && hadLoad !== hasLoad) {
      wire.group.remove();
      wires.delete(spec.id);
      wire = undefined;
    }
    if (!wire) {
      wire = createWireGroup(spec, warm);
      wire.group.dataset.drawIndex = String(index);
      wires.set(spec.id, wire);
      container.append(wire.group);
    } else {
      wire.spec = spec;
      wire.group.dataset.drawIndex = String(index);
      setWireWarm(wire, warm);
      const { path: pathClasses, glow: glowClasses } = previewWireClasses(spec, warm);
      wire.path.className.baseVal = pathClasses.join(" ");
      wire.glow.className.baseVal = glowClasses.join(" ");
      if (hasLoad) {
        wire.path.classList.add("preview-edge-load");
      } else {
        wire.path.classList.remove("preview-edge-load");
      }
      applyWireMarkers(wire, spec);
      wire.glow.style.stroke = previewWireStroke(spec);
      wire.path.style.stroke = previewWireStroke(spec);
      applyWireDepthOpacity(wire.path, wire.glow, spec, getNode);
    }
  }

  if (getNode) refreshWireDepthOpacity(wires, getNode);

  const order = new Map(specs.map((s, i) => [s.id, i]));
  for (const wire of wires.values()) {
    const idx = order.get(wire.spec.id);
    if (idx == null) continue;
    const sibling = container.children[idx];
    if (sibling !== wire.group) {
      container.insertBefore(wire.group, sibling ?? null);
    }
  }
}
