import type { PreviewConnectionKind } from "@/lib/previewEdgeTypes";
import { chipClearance, cubicPath, type CubicPathOptions } from "@/lib/resolvePreviewAnchor";

const ORTHOGONAL_STUB = 24;
const ORTHOGONAL_TRUNK_PAD = 12;
const ORTHOGONAL_LANE = 14;
const ORTHOGONAL_LINE_PAD = 8;

export type OrthogonalPathOptions = {
  stub?: number;
  lane?: number;
};

function elRectInSvg(
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

function lineRectInSvg(
  el: HTMLElement | null,
  svgBox: DOMRect,
): { left: number; right: number; top: number; bottom: number } | null {
  const line = el?.closest(".code-line");
  if (!line || typeof (line as HTMLElement).getBoundingClientRect !== "function") {
    return null;
  }
  return elRectInSvg(line as HTMLElement, svgBox);
}

function belowRectY(rect: { bottom: number } | null, fallback: number): number {
  return (rect?.bottom ?? fallback) + ORTHOGONAL_LINE_PAD;
}

export type BranchTrunkGeometry = {
  startX: number;
  busX: number;
  trunkPrefix: string;
};

export type BranchSpurInput = {
  x2: number;
  y2: number;
  toEl: HTMLElement | null;
};

/** Left gutter column — left of every branch chip, never through token text. */
export function computeBranchBusX(
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
  stub = ORTHOGONAL_STUB,
): number {
  let minLeft = Infinity;
  for (const spur of spurs) {
    const toRect = elRectInSvg(spur.toEl, svgBox);
    const left = toRect?.left ?? spur.x2;
    minLeft = Math.min(minLeft, left);
  }
  if (!Number.isFinite(minLeft)) return stub;
  return minLeft - stub - ORTHOGONAL_TRUNK_PAD;
}

/**
 * Decision → down beside source → across gutter below head line →
 * vertical bus beside case column.
 */
export function computeBranchTrunk(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
  trunkBottomY: number,
): BranchTrunkGeometry {
  const fromRect = elRectInSvg(fromEl, svgBox);
  const lineRect = lineRectInSvg(fromEl, svgBox);
  const chipRight = fromRect?.right ?? x1;
  const startX = Math.max(x1, chipRight + ORTHOGONAL_TRUNK_PAD * 0.25);
  const busX = computeBranchBusX(spurs, svgBox);
  const busTopY = belowRectY(lineRect, y1);

  return {
    startX,
    busX,
    trunkPrefix: [
      `M ${startX} ${y1}`,
      `L ${startX} ${busTopY}`,
      `L ${busX} ${busTopY}`,
      `L ${busX} ${trunkBottomY}`,
    ].join(" "),
  };
}

/** Tap from the bus rightward in the gutter, stub into the branch left anchor. */
export function branchSpurPath(
  busX: number,
  x2: number,
  y2: number,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  stub = ORTHOGONAL_STUB,
): string {
  const toRect = elRectInSvg(toEl, svgBox);
  const entryX = (toRect?.left ?? x2) - stub;

  return [
    `M ${busX} ${y2}`,
    `L ${entryX} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(" ");
}

export function layoutBranchFanPaths(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
): string[] {
  if (spurs.length === 0) return [];

  const trunkBottomY = Math.max(...spurs.map((spur) => spur.y2));
  const trunk = computeBranchTrunk(x1, y1, fromEl, spurs, svgBox, trunkBottomY);
  const spurPaths = spurs.map((spur) =>
    branchSpurPath(trunk.busX, spur.x2, spur.y2, spur.toEl, svgBox),
  );

  return [`${trunk.trunkPrefix} ${spurPaths[0]}`, ...spurPaths.slice(1)];
}

/**
 * Solo control-flow wire — one trunk + one spur (back-wires, single branch).
 */
export function branchOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
): string {
  const paths = layoutBranchFanPaths(x1, y1, fromEl, [{ x2, y2, toEl }], svgBox);
  return paths[0] ?? "";
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
    `M ${x1} ${y1}`,
    `L ${exitX} ${y1}`,
    `L ${outerX} ${y1}`,
    `L ${outerX} ${y2}`,
    `L ${entryX} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(" ");
}

export type PreviewWirePathInput = {
  connectionKind?: PreviewConnectionKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fromSide: "left" | "right";
  toSide: "left" | "right";
  fromEl: HTMLElement | null;
  toEl: HTMLElement | null;
  svgBox: DOMRect;
  lane?: number;
};

/**
 * Path geometry per preview connection kind:
 * - branch (control flow): left-gutter bus + side taps into branches
 * - usage, binding, transitive, load: cubic (data/value)
 */
export function previewWirePath(input: PreviewWirePathInput): string {
  const {
    connectionKind,
    x1,
    y1,
    x2,
    y2,
    fromSide,
    toSide,
    fromEl,
    toEl,
    svgBox,
    lane = 0,
  } = input;

  if (connectionKind === "branch") {
    return branchOrthogonalPath(x1, y1, x2, y2, fromEl, toEl, svgBox);
  }

  const cubicOpts: CubicPathOptions = {
    clearance: chipClearance(fromEl, toEl),
    lane,
  };
  return cubicPath(x1, y1, x2, y2, fromSide, toSide, cubicOpts);
}
