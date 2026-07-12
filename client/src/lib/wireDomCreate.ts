import { junctionChevronPath, type PreviewEdgeJunction } from "@/lib/previewEdgeJunction";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  previewWireClasses,
  previewWireMarkerEnd,
  previewWireMarkerStart,
  previewWireStroke,
} from "@/lib/connectionWireStyle";
import {
  TRACE_GLOW_BASELINE_RATIO,
  depthFromHop,
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

export function applyWireMarkers(wire: WireElements, spec: PreviewEdgeSpec): void {
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

export function setWireJunction(
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

export function setWireTraceStrength(
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

export function applyWireDepthOpacity(
  path: SVGPathElement,
  glow: SVGPathElement,
  spec: PreviewEdgeSpec,
  getNode?: (id: string) => Node | undefined,
): void {
  const group = path.parentElement as SVGGElement | null;
  if (group?.dataset.retiring === "1") {
    return;
  }
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

export function loadStubAnchorReady(loadEl: HTMLElement): boolean {
  return loadEl.getAttribute(LOAD_STUB_READY_ATTR) === "1";
}

export function hideWireUntilReveal(wire: WireElements): void {
  if (wire.group.dataset.revealed === "1" || wire.group.dataset.revealStarted === "1") {
    return;
  }
  setWireTraceStrength(wire.path, wire.glow, 0, 0);
}

export function revealWireIfReady(wire: WireElements, loadEl?: HTMLElement | null): void {
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
