import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  previewWireClasses,
  previewWireStroke,
} from "@/lib/connectionWireStyle";
import { MOTION_TRACE_MS } from "@/lib/motionTokens";
import { buildRevealSchedule, orderSpecsForReveal, stripWireRevealStroke } from "@/lib/wireReveal";
import {
  applyWireDepthOpacity,
  applyWireMarkers,
  createWireGroup,
  setWireWarm,
  type WireElements,
} from "@/lib/wireDomCreate";
import type { Node } from "@xyflow/react";

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

export function retireWireGroup(
  wire: WireElements,
  wires: Map<string, WireElements>,
): void {
  const id = wire.spec.id;
  if (wire.group.dataset.retiring === "1") return;
  stripWireRevealStroke(wire.path, wire.glow);
  wire.glow.style.opacity = "0";
  wire.group.dataset.retiring = "1";
  delete wire.group.dataset.revealStarted;
  delete wire.group.dataset.revealed;
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

  const revealSchedule = buildRevealSchedule(specs);
  const revealOrder = new Map(orderSpecsForReveal(specs).map((spec, index) => [spec.id, index]));

  for (const spec of specs) {
    let wire = wires.get(spec.id);
    const index = revealOrder.get(spec.id) ?? 0;
    const reveal = revealSchedule.get(spec.id);
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
      if (reveal) {
        wire.group.dataset.revealDepth = String(reveal.depth);
        wire.group.dataset.revealTie = String(reveal.tie);
        wire.group.dataset.revealDelayMs = String(reveal.delayMs);
      }
      wires.set(spec.id, wire);
      container.append(wire.group);
    } else {
      wire.spec = spec;
      wire.group.dataset.drawIndex = String(index);
      if (reveal) {
        wire.group.dataset.revealDepth = String(reveal.depth);
        wire.group.dataset.revealTie = String(reveal.tie);
        wire.group.dataset.revealDelayMs = String(reveal.delayMs);
      }
      setWireWarm(wire, warm);
      const { path: pathClasses, glow: glowClasses } = previewWireClasses(spec, warm);
      const pathDrawing = wire.path.classList.contains("preview-edge-drawing");
      const glowDrawing = wire.glow.classList.contains("preview-edge-glow-drawing");
      const pathMarching = wire.path.classList.contains("preview-edge-marching");
      const glowMarching = wire.glow.classList.contains("preview-edge-marching");
      wire.path.className.baseVal = pathClasses.join(" ");
      wire.glow.className.baseVal = glowClasses.join(" ");
      if (pathDrawing) wire.path.classList.add("preview-edge-drawing");
      if (glowDrawing) wire.glow.classList.add("preview-edge-glow-drawing");
      if (pathMarching) wire.path.classList.add("preview-edge-marching");
      if (glowMarching) wire.glow.classList.add("preview-edge-marching");
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

  const order = revealOrder;
  for (const wire of wires.values()) {
    const idx = order.get(wire.spec.id);
    if (idx == null) continue;
    const sibling = container.children[idx];
    if (sibling !== wire.group) {
      container.insertBefore(wire.group, sibling ?? null);
    }
  }
}
