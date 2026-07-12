import { chipClearance, cubicPath, resolvePreviewAnchor } from "@/lib/resolvePreviewAnchor";
import {
  STRUCTURAL_EDGE_STROKE,
  structuralMarkerId,
  structuralWireClasses,
} from "@/lib/connectionWireStyle";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { Node } from "@xyflow/react";

export type StructuralWireElements = {
  spec: StructuralEdgeSpec;
  group: SVGGElement;
  path: SVGPathElement;
};

export function createStructuralWireGroup(spec: StructuralEdgeSpec): StructuralWireElements {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-structural-edge-id", spec.id);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.classList.add(...structuralWireClasses(spec));
  if (spec.opacity != null && spec.opacity < 1) {
    path.style.opacity = String(spec.opacity);
  }

  const marker = structuralMarkerId(spec.arrowhead);
  path.setAttribute("marker-end", `url(#${marker})`);
  path.style.stroke = STRUCTURAL_EDGE_STROKE[spec.edgeType];

  group.append(path);
  return { spec, group, path };
}

export function updateStructuralWireGeometry(
  wire: StructuralWireElements,
  svgBox: DOMRect,
  _getNode: (id: string) => Node | undefined,
): boolean {
  const fromPt = resolvePreviewAnchor(wire.spec.from, svgBox, "from");
  const toPt = resolvePreviewAnchor(wire.spec.to, svgBox, "to");
  if (!fromPt || !toPt) {
    wire.group.style.display = "none";
    return false;
  }

  wire.group.style.display = "";
  const clearance = chipClearance(fromPt.el, toPt.el);
  const pathD = cubicPath(
    fromPt.x,
    fromPt.y,
    toPt.x,
    toPt.y,
    fromPt.side,
    toPt.side,
    { clearance },
  );
  wire.path.setAttribute("d", pathD);
  return true;
}

export function syncStructuralWireDom(
  container: SVGGElement,
  specs: StructuralEdgeSpec[],
  wires: Map<string, StructuralWireElements>,
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
      wire = createStructuralWireGroup(spec);
      wires.set(spec.id, wire);
      container.append(wire.group);
    } else {
      wire.spec = spec;
      wire.path.style.stroke = STRUCTURAL_EDGE_STROKE[spec.edgeType];
      wire.path.classList.toggle("structural-edge-path--pulse", spec.pulse === true);
      if (spec.opacity != null && spec.opacity < 1) {
        wire.path.style.opacity = String(spec.opacity);
      } else {
        wire.path.style.opacity = "";
      }
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
