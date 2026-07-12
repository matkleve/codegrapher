import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import {
  laneOffsetFromEdgeId,
  resolvePreviewAnchor,
  resolveTypesettingAnchors,
  wireHitMidSegment,
  wireHitSegment,
} from "@/lib/resolvePreviewAnchor";
import { branchJunctionPoint, layoutBranchFanPaths, previewWirePath } from "@/lib/wirePaths";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  previewWireClasses,
  previewWireMarkerEnd,
  previewWireMarkerStart,
  previewWireStroke,
} from "@/lib/connectionWireStyle";
import type { Node } from "@xyflow/react";

export type WireElements = {
  spec: PreviewEdgeSpec;
  group: SVGGElement;
  glow: SVGPathElement;
  path: SVGPathElement;
  junction: SVGCircleElement;
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

function setBranchJunction(
  wire: WireElements,
  spec: PreviewEdgeSpec,
  junction: { x: number; y: number } | null,
): void {
  if (spec.connectionKind !== "branch" || !junction) {
    wire.junction.style.display = "none";
    return;
  }
  wire.junction.style.display = "";
  wire.junction.setAttribute("cx", String(junction.x));
  wire.junction.setAttribute("cy", String(junction.y));
  wire.junction.style.fill = previewWireStroke(spec);
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
  if (spec.opacity != null && spec.opacity < 1 && spec.hop == null) {
    path.style.opacity = String(spec.opacity);
    glow.style.opacity = String(spec.opacity * 0.12);
  }

  const junction = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  junction.setAttribute("r", "3.5");
  junction.classList.add("preview-edge-junction");
  junction.style.display = "none";

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

type BranchWireLayout = {
  pathD: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  drawHitFrom: boolean;
  junction: { x: number; y: number } | null;
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

  const junction = branchJunctionPoint(
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
    junction,
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
    wire.hitMid.setAttribute(
      "d",
      wireHitMidSegment(fromPt.x, fromPt.y, toPt.x, toPt.y),
    );
    setBranchJunction(wire, spec, null);
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
    wire.hitMid.setAttribute(
      "d",
      wireHitMidSegment(
        fanLayout.fromX,
        fanLayout.fromY,
        fanLayout.toX,
        fanLayout.toY,
      ),
    );
    setBranchJunction(wire, spec, fanLayout.junction);
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
  wire.hitMid.setAttribute(
    "d",
    wireHitMidSegment(fromPt.x, fromPt.y, toPt.x, toPt.y),
  );

  if (spec.connectionKind === "branch") {
    setBranchJunction(
      wire,
      spec,
      branchJunctionPoint(
        fromPt.x,
        fromPt.y,
        fromPt.el,
        [{ x2: toPt.x, y2: toPt.y, toEl: toPt.el }],
        svgBox,
      ),
    );
  } else {
    setBranchJunction(wire, spec, null);
  }

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
