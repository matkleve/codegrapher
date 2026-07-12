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
import {
  depthFromHop,
  TRACE_GLOW_BASELINE_RATIO,
  traceGlowStrokeWidth,
  traceStrength,
  type TraceSituation,
} from "@/lib/traceDepth";
import { TRACE_STRENGTH_VAR } from "@/lib/traceLitApply";
import {
  isTraceSessionActive,
  isWireEmphasized,
} from "@/lib/wireHoverBoost";
import { LOAD_STUB_READY_ATTR } from "@/lib/loadStubPosition";
import { isWireRevealing, playWireReveal } from "@/lib/wireReveal";
import { MOTION_TRACE_MS } from "@/lib/motionTokens";
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

const WIRE_TRACE_STRENGTH = "preview-edge-trace-strength";

function clearWireTraceStrength(path: SVGPathElement, glow: SVGPathElement): void {
  path.style.removeProperty(TRACE_STRENGTH_VAR);
  glow.style.removeProperty(TRACE_STRENGTH_VAR);
  path.style.removeProperty("opacity");
  glow.style.removeProperty("opacity");
  path.classList.remove(WIRE_TRACE_STRENGTH);
  glow.classList.remove(WIRE_TRACE_STRENGTH);
}

function setWireTraceStrength(
  path: SVGPathElement,
  glow: SVGPathElement,
  pathStrength: number,
  glowStrength: number,
): void {
  path.classList.add(WIRE_TRACE_STRENGTH);
  glow.classList.add(WIRE_TRACE_STRENGTH);
  path.style.removeProperty("opacity");
  glow.style.removeProperty("opacity");
  path.style.setProperty(TRACE_STRENGTH_VAR, String(pathStrength));
  glow.style.setProperty(TRACE_STRENGTH_VAR, String(glowStrength));
}

function applyWireDepthOpacity(
  path: SVGPathElement,
  glow: SVGPathElement,
  spec: PreviewEdgeSpec,
  getNode?: (id: string) => Node | undefined,
): void {
  const group = path.parentElement as SVGGElement | null;
  if (group && isWireRevealing(group)) {
    return;
  }

  const pendingReveal =
    group != null &&
    group.dataset.revealed !== "1" &&
    group.dataset.revealStarted !== "1";

  if (!isTraceSessionActive()) {
    clearWireTraceStrength(path, glow);
    return;
  }

  const depth = depthFromHop(spec.hop);
  const emphasized = isWireEmphasized(spec, getNode, path);
  const situation: TraceSituation = emphasized ? "hover" : "focus";

  if (spec.opacity != null && spec.opacity < 1 && !emphasized) {
    path.classList.remove(WIRE_TRACE_STRENGTH);
    glow.classList.remove(WIRE_TRACE_STRENGTH);
    path.style.removeProperty(TRACE_STRENGTH_VAR);
    glow.style.removeProperty(TRACE_STRENGTH_VAR);
    path.style.opacity = String(spec.opacity);
    glow.style.opacity = String(spec.opacity * TRACE_GLOW_BASELINE_RATIO);
    return;
  }

  const pathStrength = traceStrength(situation, "wire", depth);
  const glowStrength = traceStrength(situation, "wireGlow", depth);
  if (pendingReveal) {
    setWireTraceStrength(path, glow, 0, 0);
    return;
  }
  setWireTraceStrength(path, glow, pathStrength, glowStrength);
  glow.style.strokeWidth = String(traceGlowStrokeWidth(depth));
  path.classList.toggle("preview-edge-line-hover", emphasized);
  glow.classList.toggle("preview-edge-line-hover", emphasized);
}

function loadStubAnchorReady(loadEl: HTMLElement): boolean {
  return loadEl.getAttribute(LOAD_STUB_READY_ATTR) === "1";
}

function hideWireUntilReveal(wire: WireElements): void {
  if (wire.group.dataset.revealed === "1" || wire.group.dataset.revealStarted === "1") {
    return;
  }
  setWireTraceStrength(wire.path, wire.glow, 0, 0);
}

function revealWireIfReady(wire: WireElements, loadEl?: HTMLElement | null): void {
  if (loadEl && !loadStubAnchorReady(loadEl)) {
    hideWireUntilReveal(wire);
    return;
  }
  const stagger = Number.parseInt(wire.group.dataset.drawIndex ?? "0", 10);
  const warmRetarget =
    wire.path.classList.contains("preview-edge-warm") &&
    wire.group.dataset.revealed === "1";
  if (!warmRetarget) {
    playWireReveal(wire, stagger);
  }
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

function retireWireGroup(
  wire: WireElements,
  wires: Map<string, WireElements>,
): void {
  const id = wire.spec.id;
  if (wire.group.dataset.retiring === "1") return;
  wire.group.dataset.retiring = "1";
  wire.group.style.transition = `opacity ${MOTION_TRACE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  wire.group.style.opacity = "0";
  window.setTimeout(() => {
    wire.group.remove();
    wires.delete(id);
  }, MOTION_TRACE_MS);
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
    retireWireGroup(wire, wires);
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
      const pathDrawing = wire.path.classList.contains("preview-edge-drawing");
      const glowDrawing = wire.glow.classList.contains("preview-edge-glow-drawing");
      const pathMarching = wire.path.classList.contains("preview-edge-marching");
      wire.path.className.baseVal = pathClasses.join(" ");
      wire.glow.className.baseVal = glowClasses.join(" ");
      if (pathDrawing) wire.path.classList.add("preview-edge-drawing");
      if (glowDrawing) wire.glow.classList.add("preview-edge-glow-drawing");
      if (pathMarching) wire.path.classList.add("preview-edge-marching");
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
