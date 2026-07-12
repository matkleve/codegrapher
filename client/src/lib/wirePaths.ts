import type { PreviewConnectionKind } from "@/lib/previewEdgeTypes";
import { chipClearance, cubicPath, type CubicPathOptions } from "@/lib/resolvePreviewAnchor";
import { branchOrthogonalPath } from "@/lib/wirePathsFan";
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
  branchJunctionPoint,
  branchOrthogonalPath,
  branchSpurPath,
  computeBranchBusX,
  computeBranchTrunk,
  cubicFanSpurPath,
  fanClusterKind,
  fanSpineRange,
  layoutBranchFanPaths,
  layoutCubicFanPaths,
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
  } = input;

  if (connectionKind === "branch") {
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
