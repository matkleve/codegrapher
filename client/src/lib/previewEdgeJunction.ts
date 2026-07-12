import type { BranchSpurInput } from "@/lib/wirePaths";

export type PreviewEdgeJunction = {
  x: number;
  y: number;
  /** Radians — average outbound fan direction (toward targets / spine). */
  bearing: number;
};

/** Circular mean of angles (radians). */
function meanAngle(angles: number[]): number {
  if (angles.length === 0) return 0;
  let sx = 0;
  let sy = 0;
  for (const angle of angles) {
    sx += Math.cos(angle);
    sy += Math.sin(angle);
  }
  return Math.atan2(sy, sx);
}

/** Outbound bearing for a fan fork — chevron points where wires leave the knot. */
export function fanJunctionBearing(
  fromX: number,
  fromY: number,
  busX: number,
  forkY: number,
  spurs: BranchSpurInput[],
  spineEndY: number,
): number {
  const outbound: number[] = spurs.map((spur) =>
    Math.atan2(spur.y2 - forkY, spur.x2 - busX),
  );
  if (spineEndY > forkY + 2) {
    outbound.push(Math.PI / 2);
  }
  if (outbound.length === 0) {
    return Math.atan2(forkY - fromY, busX - fromX);
  }
  return meanAngle(outbound);
}

/** Small filled chevron on the ring — shows fan-out direction. */
export function junctionChevronPath(cx: number, cy: number, bearing: number): string {
  const tip = 7.2;
  const base = 3.6;
  const half = 2.6;
  const tx = cx + Math.cos(bearing) * tip;
  const ty = cy + Math.sin(bearing) * tip;
  const bx = cx + Math.cos(bearing) * base;
  const by = cy + Math.sin(bearing) * base;
  const px = -Math.sin(bearing);
  const py = Math.cos(bearing);
  const x1 = bx + px * half;
  const y1 = by + py * half;
  const x2 = bx - px * half;
  const y2 = by - py * half;
  return `M ${x1} ${y1} L ${tx} ${ty} L ${x2} ${y2} Z`;
}
