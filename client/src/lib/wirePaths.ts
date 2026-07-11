import type { PreviewConnectionKind } from "@/lib/previewEdgeTypes";
import { chipClearance, cubicPath, type CubicPathOptions } from "@/lib/resolvePreviewAnchor";

const ORTHOGONAL_STUB = 24;
const ORTHOGONAL_TRUNK_PAD = 16;
const ORTHOGONAL_LANE = 14;

export type OrthogonalPathOptions = {
  stub?: number;
  lane?: number;
};

/**
 * Manhattan wire — horizontal exit, vertical trunk, horizontal entry.
 * Used for control-flow (logic) edges.
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
  lane?: number;
};

/**
 * Path geometry per preview connection kind:
 * - branch (control flow): orthogonal
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
    lane = 0,
  } = input;

  if (connectionKind === "branch") {
    return orthogonalPath(x1, y1, x2, y2, fromSide, toSide, { lane });
  }

  const cubicOpts: CubicPathOptions = {
    clearance: chipClearance(fromEl, toEl),
    lane,
  };
  return cubicPath(x1, y1, x2, y2, fromSide, toSide, cubicOpts);
}
