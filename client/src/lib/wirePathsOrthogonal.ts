export const ORTHOGONAL_STUB = 24;
export const ORTHOGONAL_TRUNK_PAD = 12;
const ORTHOGONAL_LANE = 14;
const ORTHOGONAL_LINE_PAD = 8;
/** Corner fillet on typesetting Manhattan wires — visible at 1.1px stroke. */
export const TYPESETTING_CORNER_RADIUS = 6;

type XY = { x: number; y: number };

export type OrthogonalPathOptions = {
  stub?: number;
  lane?: number;
};

export function elRectInSvg(
  el: HTMLElement | null,
  svgBox: DOMRect,
): { left: number; right: number; top: number; bottom: number } | null {
  if (!el?.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    left: r.left - svgBox.left,
    right: r.right - svgBox.left,
    top: r.top - svgBox.top,
    bottom: r.bottom - svgBox.top,
  };
}

export function lineRectInSvg(
  el: HTMLElement | null,
  svgBox: DOMRect,
): { left: number; right: number; top: number; bottom: number } | null {
  const line = el?.closest(".code-line");
  if (!line || typeof (line as HTMLElement).getBoundingClientRect !== "function") {
    return null;
  }
  return elRectInSvg(line as HTMLElement, svgBox);
}

export function belowRectY(rect: { bottom: number } | null, fallback: number): number {
  return (rect?.bottom ?? fallback) + ORTHOGONAL_LINE_PAD;
}

/** Manhattan waypoints — horizontal exit, vertical trunk, horizontal entry. */
export function orthogonalPathPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "left" | "right" = "right",
  toSide: "left" | "right" = "left",
  opts?: OrthogonalPathOptions,
): XY[] {
  const stub = opts?.stub ?? ORTHOGONAL_STUB;
  const lane = opts?.lane ?? 0;
  const laneSpread = lane * ORTHOGONAL_LANE;

  const exitX = fromSide === "right" ? x1 + stub : x1 - stub;
  const entryX = toSide === "left" ? x2 - stub : x2 + stub;
  const flowRight = x2 >= x1;
  const outerX = flowRight
    ? Math.max(exitX, entryX) + ORTHOGONAL_TRUNK_PAD + Math.abs(laneSpread)
    : Math.min(exitX, entryX) - ORTHOGONAL_TRUNK_PAD - Math.abs(laneSpread);

  return [
    { x: x1, y: y1 },
    { x: exitX, y: y1 },
    { x: outerX, y: y1 },
    { x: outerX, y: y2 },
    { x: entryX, y: y2 },
    { x: x2, y: y2 },
  ];
}

function sameCodeLine(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  y1: number,
  y2: number,
): boolean {
  const fromLine = lineRectInSvg(fromEl, svgBox);
  const toLine = lineRectInSvg(toEl, svgBox);
  if (fromLine && toLine) {
    return (
      Math.abs(fromLine.top - toLine.top) < 2 &&
      Math.abs(fromLine.bottom - toLine.bottom) < 2
    );
  }
  const fromChip = elRectInSvg(fromEl, svgBox);
  const toChip = elRectInSvg(toEl, svgBox);
  if (fromChip && toChip) {
    return Math.abs(fromChip.top - toChip.top) < 3;
  }
  return Math.abs(y1 - y2) < 4;
}

function aboveLineY(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  y1: number,
  y2: number,
  lane: number,
): number {
  const fromLine = lineRectInSvg(fromEl, svgBox);
  const toLine = lineRectInSvg(toEl, svgBox);
  let lineTop = Math.min(fromLine?.top ?? Infinity, toLine?.top ?? Infinity);
  if (!Number.isFinite(lineTop)) {
    for (const el of [fromEl, toEl]) {
      const chip = elRectInSvg(el, svgBox);
      if (chip) lineTop = Math.min(lineTop, chip.top);
    }
  }
  if (!Number.isFinite(lineTop)) {
    lineTop = Math.min(y1, y2);
  }
  return lineTop - ORTHOGONAL_LINE_PAD - Math.abs(lane * ORTHOGONAL_LANE);
}

/** Rise above a signature line, run over the tokens, drop into the target chip. */
export function aboveLineRoutePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  _toSide: "left" | "right",
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  opts?: OrthogonalPathOptions,
): XY[] {
  const lane = opts?.lane ?? 0;
  const aboveY = aboveLineY(fromEl, toEl, svgBox, y1, y2, lane);

  return [
    { x: x1, y: y1 },
    { x: x1, y: aboveY },
    { x: x2, y: aboveY },
    { x: x2, y: y2 },
  ];
}

/** Typesetting on one signature line — route above the text, over the param slot. */
export function typesettingPathPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "left" | "right",
  toSide: "left" | "right",
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  opts?: OrthogonalPathOptions,
): XY[] {
  if (!sameCodeLine(fromEl, toEl, svgBox, y1, y2)) {
    return orthogonalPathPoints(x1, y1, x2, y2, fromSide, toSide, opts);
  }

  return aboveLineRoutePoints(x1, y1, x2, y2, toSide, fromEl, toEl, svgBox, opts);
}

/** Fillet sharp corners on an orthogonal polyline with quadratic beziers. */
export function roundedPolylinePath(points: XY[], radius: number): string {
  const n = points.length;
  if (n < 2) return "";
  if (n === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  const parts: string[] = [`M ${points[0]!.x} ${points[0]!.y}`];

  for (let i = 1; i < n - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;

    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    if (inLen === 0 || outLen === 0) continue;

    const r = Math.min(radius, inLen / 2, outLen / 2);
    const inDx = (curr.x - prev.x) / inLen;
    const inDy = (curr.y - prev.y) / inLen;
    const outDx = (next.x - curr.x) / outLen;
    const outDy = (next.y - curr.y) / outLen;

    parts.push(`L ${curr.x - inDx * r} ${curr.y - inDy * r}`);
    parts.push(
      `Q ${curr.x} ${curr.y} ${curr.x + outDx * r} ${curr.y + outDy * r}`,
    );
  }

  const last = points[n - 1]!;
  parts.push(`L ${last.x} ${last.y}`);
  return parts.join(" ");
}

/**
 * Manhattan wire — horizontal exit, vertical trunk, horizontal entry.
 * Used for non-token structural routing when port sides are authoritative.
 */
export function orthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "left" | "right" = "right",
  toSide: "left" | "right" = "left",
  opts?: OrthogonalPathOptions,
): string {
  const points = orthogonalPathPoints(x1, y1, x2, y2, fromSide, toSide, opts);
  return points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
}

/** Typesetting preview wire — rounded-corner Manhattan between sig-type and param. */
export function typesettingOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "left" | "right",
  toSide: "left" | "right",
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  opts?: OrthogonalPathOptions,
): string {
  return roundedPolylinePath(
    typesettingPathPoints(
      x1,
      y1,
      x2,
      y2,
      fromSide,
      toSide,
      fromEl,
      toEl,
      svgBox,
      opts,
    ),
    TYPESETTING_CORNER_RADIUS,
  );
}
