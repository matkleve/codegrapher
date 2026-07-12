import type { PreviewConnectionKind } from "@/lib/previewEdgeTypes";
import {
  chipClearance,
  cubicPath,
  cubicPortSides,
  straightPath,
  treeSpinePath,
  type CubicPathOptions,
} from "@/lib/resolvePreviewAnchor";
import {
  branchOrthogonalPath,
  branchSpurPath,
  computeBranchTrunk,
  computeFanBusX,
  fanClusterKind,
  fanSpineRange,
  type BranchSpurInput,
  type FanPathLayout,
} from "@/lib/wirePathsFan";
import { typesettingOrthogonalPath } from "@/lib/wirePathsOrthogonal";

export type {
  BranchSpurInput,
  BranchTrunkGeometry,
  FanClusterKind,
  FanPathLayout,
} from "@/lib/wirePathsFan";
export {
  FAN_CLUSTER_BUS_EXTRA,
  FAN_CLUSTER_Y_SPREAD,
  FAN_HORIZONTAL_SPLIT_ABOVE,
  branchJunctionPoint,
  branchOrthogonalPath,
  branchSpurPath,
  computeBranchBusX,
  computeBranchTrunk,
  computeFanBusX,
  fanClusterKind,
  fanSpineRange,
  fanUsesCenterAboveBus,
  layoutBranchFanPaths,
} from "@/lib/wirePathsFan";
export type { OrthogonalPathOptions } from "@/lib/wirePathsOrthogonal";
export {
  TYPESETTING_CORNER_RADIUS,
  aboveLineRoutePoints,
  elRectInSvg,
  lineRectInSvg,
  orthogonalPath,
  orthogonalPathPoints,
  roundedPolylinePath,
  typesettingOrthogonalPath,
  typesettingPathPoints,
} from "@/lib/wirePathsOrthogonal";

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
  /** Fan bus leg — branch uses trunk/spur segments; data kinds ignore and use point-to-point cubic. */
  fanLeg?: "trunk" | "spur";
};

/**
 * Path geometry per preview connection kind:
 * - branch (control flow): left-gutter bus + side taps into branches
 * - typesetting: rounded-corner Manhattan (sig-type → param def)
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
    fanLeg,
  } = input;

  if (connectionKind === "branch") {
    if (fanLeg === "trunk") {
      return computeBranchTrunk(
        x1,
        y1,
        fromEl,
        [{ x2, y2, toEl }],
        svgBox,
        y2,
        x2,
      ).trunkPrefix;
    }
    if (fanLeg === "spur") {
      return branchSpurPath(x1, x2, y2, toEl, svgBox);
    }
    return branchOrthogonalPath(x1, y1, x2, y2, fromEl, toEl, svgBox);
  }

  if (connectionKind === "typesetting") {
    return typesettingOrthogonalPath(
      x1,
      y1,
      x2,
      y2,
      fromSide,
      toSide,
      fromEl,
      toEl,
      svgBox,
      { lane },
    );
  }

  const cubicOpts: CubicPathOptions = {
    clearance: chipClearance(fromEl, toEl),
    lane,
  };
  return cubicPath(x1, y1, x2, y2, fromSide, toSide, cubicOpts);
}

/** Fan layout — every leg calls `previewWirePath` with the group's `connectionKind`. */
export function layoutFanPaths(
  connectionKind: PreviewConnectionKind,
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  fromSide: "left" | "right",
  spurs: BranchSpurInput[],
  svgBox: DOMRect,
): FanPathLayout {
  if (spurs.length === 0) return { paths: [], busX: 0, clusterKind: "solo" };

  const clusterKind = fanClusterKind(spurs);
  const { forkY, spineEndY } = fanSpineRange(spurs, clusterKind, y1);
  const busX = computeFanBusX(spurs, svgBox, clusterKind, y1);
  const knotSides = cubicPortSides(x1, busX);

  const trunkPrefix = previewWirePath({
    connectionKind,
    fanLeg: "trunk",
    x1,
    y1,
    x2: busX,
    y2: forkY,
    fromSide,
    toSide: knotSides.toSide,
    fromEl,
    toEl: spurs[0]?.toEl ?? null,
    svgBox,
  });

  const spurPaths = spurs.map((spur) => {
    const startY = clusterKind === "horizontal" ? forkY : spur.y2;
    const spurSides = cubicPortSides(busX, spur.x2);
    return previewWirePath({
      connectionKind,
      fanLeg: "spur",
      x1: busX,
      y1: startY,
      x2: spur.x2,
      y2: spur.y2,
      fromSide: spurSides.fromSide,
      toSide: spur.toSide ?? spurSides.toSide,
      fromEl,
      toEl: spur.toEl,
      svgBox,
    });
  });

  let path0 = `${trunkPrefix} ${spurPaths[0] ?? ""}`;
  if (spineEndY > forkY + 2) {
    const spine =
      connectionKind === "branch"
        ? straightPath(busX, forkY, busX, spineEndY)
        : treeSpinePath(busX, forkY, spineEndY, "left");
    path0 = `${path0} ${spine}`;
  }

  return {
    busX,
    clusterKind,
    paths: [path0, ...spurPaths.slice(1)],
  };
}

/** @deprecated Use `layoutFanPaths` */
export const layoutCubicFanPaths = layoutFanPaths;
