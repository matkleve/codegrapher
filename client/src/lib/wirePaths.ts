import type { PreviewConnectionKind } from "@/lib/previewEdgeTypes";
import { chipClearance, cubicPath, type CubicPathOptions } from "@/lib/resolvePreviewAnchor";

const ORTHOGONAL_STUB = 24;
const ORTHOGONAL_TRUNK_PAD = 12;
const ORTHOGONAL_LANE = 14;

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

export type BranchTrunkGeometry = {
  startX: number;
  trunkX: number;
  trunkPrefix: string;
};

export type BranchSpurInput = {
  x2: number;
  y2: number;
  toEl: HTMLElement | null;
};

/** Short exit column to the right of the source, then straight down. */
export function computeBranchTrunk(
  x1: number,
  y1: number,
  fromEl: HTMLElement | null,
  svgBox: DOMRect,
  trunkBottomY: number,
): BranchTrunkGeometry {
  const fromRect = elRectInSvg(fromEl, svgBox);
  const chipRight = fromRect?.right ?? x1;
  const startX = Math.max(x1, chipRight + ORTHOGONAL_TRUNK_PAD * 0.25);
  const trunkX = startX + ORTHOGONAL_STUB;

  return {
    startX,
    trunkX,
    trunkPrefix: [
      `M ${startX} ${y1}`,
      `L ${trunkX} ${y1}`,
      `L ${trunkX} ${trunkBottomY}`,
    ].join(" "),
  };
}

/** Branch off the trunk at the target row — left along the row, stub into anchor. */
export function branchSpurPath(
  trunkX: number,
  x2: number,
  y2: number,
  toEl: HTMLElement | null,
  svgBox: DOMRect,
  stub = ORTHOGONAL_STUB,
): string {
  const toRect = elRectInSvg(toEl, svgBox);
  const entryX = (toRect?.left ?? x2) - stub;

  return [
    `M ${trunkX} ${y2}`,
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
  const trunkBottomY = Math.max(...spurs.map((spur) => spur.y2));
  const trunk = computeBranchTrunk(x1, y1, fromEl, svgBox, trunkBottomY);
  const spurPaths = spurs.map((spur) =>
    branchSpurPath(trunk.trunkX, spur.x2, spur.y2, spur.toEl, svgBox),
  );

  if (spurPaths.length === 0) return [];
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
 * - branch (control flow): bbox-aware orthogonal (exit right of source, enter branch)
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
