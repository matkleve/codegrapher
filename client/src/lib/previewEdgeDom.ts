import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import {
  laneOffsetFromEdgeId,
  resolvePreviewAnchor,
  wireHitSegment,
} from "@/lib/resolvePreviewAnchor";
import { layoutBranchFanPaths, previewWirePath } from "@/lib/wirePaths";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { previewWireClasses, previewWireMarkerId, previewWireStroke } from "@/lib/connectionWireStyle";
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

  const { path: pathClasses, glow: glowClasses } = previewWireClasses(spec, warm);

  const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  glow.setAttribute("fill", "none");
  glow.classList.add(...glowClasses);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.classList.add(...pathClasses);
  if (spec.opacity != null && spec.opacity < 1 && spec.hop == null) {
    path.style.opacity = String(spec.opacity);
    glow.style.opacity = String(spec.opacity * 0.12);
  }
  if (!spec.load) {
    path.setAttribute("marker-end", `url(#${previewWireMarkerId()})`);
  }

  const hitFrom = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitFrom.setAttribute("fill", "none");
  hitFrom.classList.add("preview-edge-hit");

  const hitTo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hitTo.setAttribute("fill", "none");
  hitTo.classList.add("preview-edge-hit");

  const stroke = previewWireStroke(spec);
  glow.style.stroke = stroke;
  path.style.stroke = stroke;

  group.append(glow, path, hitFrom, hitTo);

  return { spec, group, glow, path, hitFrom, hitTo };
}

export function setWireWarm(wire: WireElements, warm: boolean): void {
  wire.glow.classList.toggle("preview-edge-warm", warm);
  wire.path.classList.toggle("preview-edge-warm", warm);
}

type BranchWireLayout = {
  pathD: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  drawHitFrom: boolean;
};

function resolveBranchFanLayout(
  spec: PreviewEdgeSpec,
  allSpecs: PreviewEdgeSpec[],
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
): BranchWireLayout | null {
  const fan = spec.branchFan;
  if (!fan || fan.count <= 1) return null;

  const groupSpecs = allSpecs.filter(
    (s) =>
      s.connectionKind === "branch" &&
      s.branchFan?.groupId === fan.groupId &&
      s.branchFan.count > 1,
  );
  if (groupSpecs.length <= 1) return null;

  groupSpecs.sort((a, b) => a.branchFan!.index - b.branchFan!.index);

  const head = groupSpecs[0]!;
  const { from } = refinePreviewEdge(head, getNode);
  const fromPt = resolvePreviewAnchor(from, svgBox, "from");
  if (!fromPt) return null;

  const resolved = groupSpecs
    .map((s) => {
      const { to } = refinePreviewEdge(s, getNode);
      const toPt = resolvePreviewAnchor(to, svgBox, "to");
      if (!toPt) return null;
      return { spec: s, toPt };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (resolved.length <= 1) return null;

  const paths = layoutBranchFanPaths(
    fromPt.x,
    fromPt.y,
    fromPt.el,
    resolved.map((row) => ({
      x2: row.toPt.x,
      y2: row.toPt.y,
      toEl: row.toPt.el,
    })),
    svgBox,
  );

  const index = resolved.findIndex((row) => row.spec.id === spec.id);
  if (index < 0) return null;

  const row = resolved[index]!;
  const pathD = paths[index];
  if (!pathD) return null;

  return {
    pathD,
    fromX: fromPt.x,
    fromY: fromPt.y,
    toX: row.toPt.x,
    toY: row.toPt.y,
    drawHitFrom: index === 0,
  };
}

export function updateWireGeometry(
  wire: WireElements,
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
  allSpecs: PreviewEdgeSpec[] = [],
): boolean {
  const spec = wire.spec;
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
    const lane = laneOffsetFromEdgeId(spec.id);
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
    return true;
  }

  const { from, to } = refinePreviewEdge(wire.spec, getNode);
  const fromPt = resolvePreviewAnchor(from, svgBox, "from");
  const toPt = resolvePreviewAnchor(to, svgBox, "to");
  if (!fromPt || !toPt) {
    wire.group.style.display = "none";
    return false;
  }

  if (fromPt.el && toPt.el && fromPt.el === toPt.el) {
    wire.group.style.display = "none";
    return false;
  }

  wire.group.style.display = "";

  const fanLayout = resolveBranchFanLayout(spec, allSpecs, svgBox, getNode);
  if (fanLayout) {
    wire.path.setAttribute("d", fanLayout.pathD);
    wire.glow.setAttribute("d", fanLayout.pathD);
    wire.hitFrom.setAttribute(
      "d",
      fanLayout.drawHitFrom
        ? wireHitSegment(
            fanLayout.fromX,
            fanLayout.fromY,
            fanLayout.toX,
            fanLayout.toY,
            "from",
          )
        : "",
    );
    wire.hitTo.setAttribute(
      "d",
      wireHitSegment(
        fanLayout.fromX,
        fanLayout.fromY,
        fanLayout.toX,
        fanLayout.toY,
        "to",
      ),
    );
    return true;
  }

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
    lane: laneOffsetFromEdgeId(spec.id),
  });
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
    const hadLoad = wire?.spec.load != null;
    const hasLoad = spec.load != null;
    if (wire && hadLoad !== hasLoad) {
      wire.group.remove();
      wires.delete(spec.id);
      wire = undefined;
    }
    if (!wire) {
      wire = createWireGroup(spec, warm);
      wires.set(spec.id, wire);
      container.append(wire.group);
    } else {
      wire.spec = spec;
      setWireWarm(wire, warm);
      if (hasLoad) {
        wire.path.classList.add("preview-edge-load");
        wire.path.removeAttribute("marker-end");
      } else {
        wire.path.classList.remove("preview-edge-load");
        wire.path.setAttribute("marker-end", `url(#${previewWireMarkerId()})`);
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
