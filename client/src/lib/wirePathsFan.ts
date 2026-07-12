import { chipClearance, cubicPath, cubicPortSides, treeSpinePath } from "@/lib/resolvePreviewAnchor";
import {
  belowRectY,
  elRectInSvg,
  lineRectInSvg,
  ORTHOGONAL_STUB,
  ORTHOGONAL_TRUNK_PAD,
} from "@/lib/wirePathsOrthogonal";

export type BranchTrunkGeometry = {
  startX: number;
  busX: number;
  busTopY: number;
  trunkPrefix: string;
};

export type BranchSpurInput = {
  x2: number;
  y2: number;
  toEl: HTMLElement | null;
};

/** Same-line fan targets share one fork row (px). */
export const FAN_CLUSTER_Y_SPREAD = 10;
/** Extra gutter before a tight cluster so the knot forks left of the chips. */
export const FAN_CLUSTER_BUS_EXTRA = 20;

export type FanClusterKind = "solo" | "horizontal" | "vertical";

export function fanClusterKind(spurs: BranchSpurInput[]): FanClusterKind {
  if (spurs.length < 2) return "solo";
  const ys = spurs.map((spur) => spur.y2);
  const spread = Math.max(...ys) - Math.min(...ys);
  return spread <= FAN_CLUSTER_Y_SPREAD ? "horizontal" : "vertical";
}

/** Fork row (top of cluster) and how far the shared spine runs on wire 0. */
export function fanSpineRange(
  spurs: BranchSpurInput[],
  clusterKind: FanClusterKind,
): { forkY: number; spineEndY: number } {
  const ys = spurs.map((spur) => spur.y2);
  const forkY = Math.min(...ys);
  const spineEndY =
    clusterKind === "vertical" && spurs.length > 1 ? Math.max(...ys) : forkY;
  return { forkY, spineEndY };
}

function computeFanBusX(
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
  kind: FanClusterKind,
): number {
  const base = computeBranchBusX(spurs, svgBox);
  return kind === "solo" ? base : base - FAN_CLUSTER_BUS_EXTRA;
}

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
  busXOverride?: number,
): BranchTrunkGeometry {
  const fromRect = elRectInSvg(fromEl, svgBox);
  const lineRect = lineRectInSvg(fromEl, svgBox);
  const chipRight = fromRect?.right ?? x1;
  const startX = Math.max(x1, chipRight + ORTHOGONAL_TRUNK_PAD * 0.25);
  const busX = busXOverride ?? computeBranchBusX(spurs, svgBox);
  const busTopY = belowRectY(lineRect, y1);

  return {
    startX,
    busX,
    busTopY,
    trunkPrefix: [
      `M ${startX} ${y1}`,
      `L ${startX} ${busTopY}`,
      `L ${busX} ${busTopY}`,
      `L ${busX} ${trunkBottomY}`,
    ].join(" "),
  };
}

/** Fork-node position where the control-flow trunk meets the vertical bus. */
export function branchJunctionPoint(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
): { x: number; y: number } | null {
  if (spurs.length === 0) return null;
  const trunkBottomY = Math.max(...spurs.map((spur) => spur.y2));
  const trunk = computeBranchTrunk(x1, y1, fromEl, spurs, svgBox, trunkBottomY);
  return { x: trunk.busX, y: trunk.busTopY };
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

export type FanPathLayout = {
  paths: string[];
  busX: number;
  clusterKind: FanClusterKind;
};

export function layoutBranchFanPaths(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
): FanPathLayout {
  if (spurs.length === 0) return { paths: [], busX: 0, clusterKind: "solo" };

  const clusterKind = fanClusterKind(spurs);
  const { forkY, spineEndY } = fanSpineRange(spurs, clusterKind);
  const busX = computeBranchBusX(spurs, svgBox);
  const trunk = computeBranchTrunk(
    x1,
    y1,
    fromEl,
    spurs,
    svgBox,
    forkY,
    busX,
  );
  const spurPaths = spurs.map((spur) =>
    branchSpurPath(trunk.busX, spur.x2, spur.y2, spur.toEl, svgBox),
  );

  let path0 = `${trunk.trunkPrefix} ${spurPaths[0] ?? ""}`;
  if (spineEndY > forkY + 2) {
    path0 = `${path0} M ${trunk.busX} ${forkY} L ${trunk.busX} ${spineEndY}`;
  }

  return {
    busX: trunk.busX,
    clusterKind,
    paths: [path0, ...spurPaths.slice(1)],
  };
}

/** Cubic approach into the fork — one curve from source to the bus knot. */
function computeCubicFanTrunk(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
  forkY: number,
  clusterKind: FanClusterKind,
): BranchTrunkGeometry {
  const busX = computeFanBusX(spurs, svgBox, clusterKind);
  const clearance = chipClearance(fromEl, spurs[0]?.toEl ?? null);
  const approachSides = cubicPortSides(x1, busX);
  const trunkPrefix = cubicPath(
    x1,
    y1,
    busX,
    forkY,
    approachSides.fromSide,
    approachSides.toSide,
    { clearance },
  );

  return {
    startX: x1,
    busX,
    busTopY: forkY,
    trunkPrefix,
  };
}

/** Cubic fan — shared cubic trunk + cubic spurs into each target. */
export function cubicFanSpurPath(
  busX: number,
  spur: BranchSpurInput,
  svgBox: DOMRect,
  fromEl: HTMLElement | null,
  _clusterKind: FanClusterKind,
): string {
  const clearance = chipClearance(fromEl, spur.toEl);
  return cubicPath(busX, spur.y2, spur.x2, spur.y2, "right", "left", { clearance });
}

export function layoutCubicFanPaths(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
): FanPathLayout {
  if (spurs.length === 0) return { paths: [], busX: 0, clusterKind: "solo" };

  const clusterKind = fanClusterKind(spurs);
  const { forkY, spineEndY } = fanSpineRange(spurs, clusterKind);
  const trunk = computeCubicFanTrunk(
    x1,
    y1,
    fromEl,
    spurs,
    svgBox,
    forkY,
    clusterKind,
  );
  const spurPaths = spurs.map((spur) =>
    cubicFanSpurPath(trunk.busX, spur, svgBox, fromEl, clusterKind),
  );

  let path0 = `${trunk.trunkPrefix} ${spurPaths[0] ?? ""}`;
  if (spineEndY > forkY + 2) {
    path0 = `${path0} ${treeSpinePath(trunk.busX, forkY, spineEndY, "left")}`;
  }

  return {
    busX: trunk.busX,
    clusterKind,
    paths: [path0, ...spurPaths.slice(1)],
  };
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
  const { paths } = layoutBranchFanPaths(x1, y1, fromEl, [{ x2, y2, toEl }], svgBox);
  return paths[0] ?? "";
}
