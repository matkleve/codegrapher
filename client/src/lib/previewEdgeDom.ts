import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import {
  cubicPath,
  resolvePreviewAnchor,
  wireHitSegment,
} from "@/lib/resolvePreviewAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";
import type { Node } from "@xyflow/react";

export type WireElements = {
  spec: PreviewEdgeSpec;
  group: SVGGElement;
  glow: SVGPathElement;
  path: SVGPathElement;
  hitFrom: SVGPathElement;
  hitTo: SVGPathElement;
};

export function createWireGroup(
  spec: PreviewEdgeSpec,
  warm: boolean,
): WireElements {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-edge-id", spec.id);

  const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  glow.setAttribute("fill", "none");
  glow.classList.add("preview-edge-glow");
  if (warm) glow.classList.add("preview-edge-warm");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.classList.add("preview-edge-path");
  if (spec.load) path.classList.add("preview-edge-load");
  if (warm) path.classList.add("preview-edge-warm");
  if (!spec.load) path.setAttribute("marker-end", "url(#preview-edge-arrow)");

  const hitFrom = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitFrom.setAttribute("fill", "none");
  hitFrom.classList.add("preview-edge-hit");

  const hitTo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitTo.setAttribute("fill", "none");
  hitTo.classList.add("preview-edge-hit");

  const stroke = TOKEN_EDGE_STROKE[spec.kind];
  glow.style.stroke = stroke;
  path.style.stroke = stroke;

  group.append(glow, path, hitFrom, hitTo);

  return { spec, group, glow, path, hitFrom, hitTo };
}

export function setWireWarm(wire: WireElements, warm: boolean): void {
  wire.glow.classList.toggle("preview-edge-warm", warm);
  wire.path.classList.toggle("preview-edge-warm", warm);
}

export function updateWireGeometry(
  wire: WireElements,
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
): boolean {
  const spec = wire.spec;
  if (spec.load) {
    const toRef = refinePreviewEdge(spec, getNode).to;
    const toPt = resolvePreviewAnchor(toRef, svgBox, "to");
    if (!toPt) {
      wire.group.style.display = "none";
      return false;
    }
    const pillOffset = 52;
    const fromX = toPt.x - pillOffset;
    const fromY = toPt.y;
    const toX = toPt.x;
    const toY = toPt.y;
    wire.group.style.display = "";
    const pathD = cubicPath(fromX, fromY, toX, toY, "right", "left");
    wire.path.setAttribute("d", pathD);
    wire.glow.setAttribute("d", pathD);
    wire.hitFrom.setAttribute("d", "");
    wire.hitTo.setAttribute("d", "");
    return true;
  }

  const { from, to } = refinePreviewEdge(wire.spec, getNode);
  const fromPt = resolvePreviewAnchor(from, svgBox, "from");
  const toPt = resolvePreviewAnchor(to, svgBox, "to");
  if (!fromPt || !toPt) {
    wire.group.style.display = "none";
    return false;
  }

  wire.group.style.display = "";
  const pathD = cubicPath(
    fromPt.x,
    fromPt.y,
    toPt.x,
    toPt.y,
    fromPt.side,
    toPt.side,
  );
  wire.path.setAttribute("d", pathD);
  wire.glow.setAttribute("d", pathD);
  wire.hitFrom.setAttribute(
    "d",
    wireHitSegment(fromPt.x, fromPt.y, toPt.x, toPt.y, "from"),
  );
  wire.hitTo.setAttribute(
    "d",
    wireHitSegment(fromPt.x, fromPt.y, toPt.x, toPt.y, "to"),
  );
  return true;
}

export function syncWireDom(
  container: SVGGElement,
  specs: PreviewEdgeSpec[],
  wires: Map<string, WireElements>,
  warm: boolean,
): void {
  const nextIds = new Set(specs.map((s) => s.id));

  for (const [id, wire] of wires) {
    if (nextIds.has(id)) continue;
    wire.group.remove();
    wires.delete(id);
  }

  for (const spec of specs) {
    let wire = wires.get(spec.id);
    if (!wire) {
      wire = createWireGroup(spec, warm);
      wires.set(spec.id, wire);
      container.append(wire.group);
    } else {
      wire.spec = spec;
      setWireWarm(wire, warm);
    }
  }

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
