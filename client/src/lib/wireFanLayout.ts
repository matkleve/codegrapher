import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import {
  resolvePreviewAnchor,
  resolveTypesettingAnchors,
  type ResolvedAnchor,
} from "@/lib/resolvePreviewAnchor";
import type { PreviewConnectionKind, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  layoutBranchFanPaths,
  layoutCubicFanPaths,
  type BranchSpurInput,
} from "@/lib/wirePaths";
import type { Node } from "@xyflow/react";

/** Max vertical spread (px) between fan targets to share one bus. */
export const FAN_TARGET_Y_SPAN = 104;
/** Min vertical spread — skip fan when targets are nearly colocated (solo cubic is cleaner). */
export const FAN_TARGET_MIN_SPREAD = 12;

export type ResolvedWireEndpoints = {
  spec: PreviewEdgeSpec;
  fromPt: ResolvedAnchor;
  toPt: ResolvedAnchor;
};

export type WireFanMemberLayout = {
  pathD: string;
  junction: { x: number; y: number } | null;
  drawHitFrom: boolean;
  drawTrunkClass: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type WireLayoutContext = {
  fanMembers: Map<string, WireFanMemberLayout>;
  lanes: Map<string, number>;
};

const ORTHOGONAL_LANE_KINDS = new Set<PreviewConnectionKind>(["branch", "typesetting"]);

function isBranchFanKind(kind: PreviewConnectionKind): boolean {
  return kind === "branch";
}

function canDynamicFan(kind: PreviewConnectionKind): boolean {
  return kind === "branch" || kind === "usage" || kind === "binding" || kind === "transitive";
}

const elFanIds = new WeakMap<HTMLElement, string>();
let elFanCounter = 0;

function fanElementId(el: HTMLElement): string {
  let id = elFanIds.get(el);
  if (!id) {
    elFanCounter += 1;
    id = `fan-el-${elFanCounter}`;
    elFanIds.set(el, id);
  }
  return id;
}

function connectionKindOf(spec: PreviewEdgeSpec): PreviewConnectionKind {
  return spec.connectionKind ?? "usage";
}

function memberScopeKey(el: HTMLElement | null): string | null {
  if (!el?.isConnected) return null;
  const row = el.closest("[data-member-id]");
  const node = el.closest("[data-flow-node-id]");
  if (!row || !node) return null;
  return `${node.getAttribute("data-flow-node-id")}:${row.getAttribute("data-member-id")}`;
}

export function resolveWireEndpoints(
  spec: PreviewEdgeSpec,
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
): ResolvedWireEndpoints | null {
  if (spec.load) return null;

  const { from, to } = refinePreviewEdge(spec, getNode);
  const anchorPair =
    spec.connectionKind === "typesetting"
      ? resolveTypesettingAnchors(from, to, svgBox)
      : null;
  const fromPt = anchorPair?.fromPt ?? resolvePreviewAnchor(from, svgBox, "from");
  const toPt = anchorPair?.toPt ?? resolvePreviewAnchor(to, svgBox, "to");
  if (!fromPt || !toPt) return null;
  if (fromPt.el && toPt.el && fromPt.el === toPt.el) return null;

  return { spec, fromPt, toPt };
}

function shouldFanCluster(wires: ResolvedWireEndpoints[]): boolean {
  if (wires.length < 2) return false;
  const ys = wires.map((w) => w.toPt.y);
  const spread = Math.max(...ys) - Math.min(...ys);
  if (spread > FAN_TARGET_Y_SPAN) return false;
  if (spread < FAN_TARGET_MIN_SPREAD && wires.length === 2) {
    const xs = wires.map((w) => w.toPt.x);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    if (xSpread < FAN_TARGET_MIN_SPREAD) return false;
  }
  const fromX = wires[0]!.fromPt.x;
  const sameDirection = wires.every((w) => w.toPt.x >= fromX - 24);
  return sameDirection;
}

/** Split a source bucket into maximal Y-proximity clusters that may each fan. */
export function partitionFanClusters(
  wires: ResolvedWireEndpoints[],
): ResolvedWireEndpoints[][] {
  if (wires.length < 2) return [];
  const sorted = sortFanWires(wires);
  const raw: ResolvedWireEndpoints[][] = [];
  let current: ResolvedWireEndpoints[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const wire = sorted[i]!;
    const ys = [...current.map((w) => w.toPt.y), wire.toPt.y];
    const spread = Math.max(...ys) - Math.min(...ys);
    if (spread <= FAN_TARGET_Y_SPAN) {
      current.push(wire);
      continue;
    }
    raw.push(current);
    current = [wire];
  }
  raw.push(current);

  return raw.filter((cluster) => shouldFanCluster(cluster));
}

function sourceClusterKey(w: ResolvedWireEndpoints): string | null {
  const el = w.fromPt.el;
  if (!el) return null;
  return `${connectionKindOf(w.spec)}:${fanElementId(el)}`;
}

function sortFanWires(wires: ResolvedWireEndpoints[]): ResolvedWireEndpoints[] {
  return [...wires].sort((a, b) => {
    const y = a.toPt.y - b.toPt.y;
    if (y !== 0) return y;
    const x = a.toPt.x - b.toPt.x;
    if (x !== 0) return x;
    return a.spec.id.localeCompare(b.spec.id);
  });
}

function layoutFanGroup(
  wires: ResolvedWireEndpoints[],
  svgBox: DOMRect,
): Map<string, WireFanMemberLayout> {
  const out = new Map<string, WireFanMemberLayout>();
  if (wires.length === 0) return out;

  const head = wires[0]!;
  const spurs: BranchSpurInput[] = wires.map((w) => ({
    x2: w.toPt.x,
    y2: w.toPt.y,
    toEl: w.toPt.el,
  }));

  const kind = connectionKindOf(head.spec);
  const layout = isBranchFanKind(kind)
    ? layoutBranchFanPaths(head.fromPt.x, head.fromPt.y, head.fromPt.el, spurs, svgBox)
    : layoutCubicFanPaths(head.fromPt.x, head.fromPt.y, head.fromPt.el, spurs, svgBox);

  wires.forEach((wire, index) => {
    const pathD = layout.paths[index];
    if (!pathD) return;
    out.set(wire.spec.id, {
      pathD,
      junction: { x: layout.busX, y: wire.toPt.y },
      drawHitFrom: index === 0,
      drawTrunkClass: index === 0 && wires.length > 1,
      fromX: head.fromPt.x,
      fromY: head.fromPt.y,
      toX: wire.toPt.x,
      toY: wire.toPt.y,
    });
  });

  return out;
}

export function buildWireLayoutContext(
  specs: PreviewEdgeSpec[],
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
): WireLayoutContext {
  const fanMembers = new Map<string, WireFanMemberLayout>();
  const lanes = new Map<string, number>();
  const resolved: ResolvedWireEndpoints[] = [];

  for (const spec of specs) {
    const row = resolveWireEndpoints(spec, svgBox, getNode);
    if (row) resolved.push(row);
  }

  const explicitGroups = new Map<string, ResolvedWireEndpoints[]>();
  const ungrouped: ResolvedWireEndpoints[] = [];

  for (const row of resolved) {
    const fan = row.spec.branchFan;
    if (fan && fan.count > 1) {
      const key = `branch:${fan.groupId}`;
      const bucket = explicitGroups.get(key) ?? [];
      bucket.push(row);
      explicitGroups.set(key, bucket);
    } else {
      ungrouped.push(row);
    }
  }

  for (const wires of explicitGroups.values()) {
    const sorted = sortFanWires(wires);
    for (const [id, layout] of layoutFanGroup(sorted, svgBox)) {
      fanMembers.set(id, layout);
    }
  }

  const dynamicBuckets = new Map<string, ResolvedWireEndpoints[]>();
  for (const row of ungrouped) {
    const kind = connectionKindOf(row.spec);
    if (!canDynamicFan(kind)) continue;
    const key = sourceClusterKey(row);
    if (!key) continue;
    const bucket = dynamicBuckets.get(key) ?? [];
    bucket.push(row);
    dynamicBuckets.set(key, bucket);
  }

  for (const wires of dynamicBuckets.values()) {
    for (const cluster of partitionFanClusters(wires)) {
      for (const [id, layout] of layoutFanGroup(cluster, svgBox)) {
        fanMembers.set(id, layout);
      }
    }
  }

  const memberOrthogonal = new Map<string, ResolvedWireEndpoints[]>();
  for (const row of resolved) {
    const kind = connectionKindOf(row.spec);
    if (!ORTHOGONAL_LANE_KINDS.has(kind)) continue;
    const scope = memberScopeKey(row.fromPt.el ?? row.toPt.el);
    if (!scope) continue;
    const bucket = memberOrthogonal.get(scope) ?? [];
    bucket.push(row);
    memberOrthogonal.set(scope, bucket);
  }

  for (const wires of memberOrthogonal.values()) {
    const sorted = [...wires].sort((a, b) => a.spec.id.localeCompare(b.spec.id));
    const center = (sorted.length - 1) / 2;
    sorted.forEach((wire, index) => {
      lanes.set(wire.spec.id, index - center);
    });
  }

  return { fanMembers, lanes };
}

export function getWireLayoutContext(
  specs: PreviewEdgeSpec[],
  svgBox: DOMRect,
  getNode: (id: string) => Node | undefined,
): WireLayoutContext {
  return buildWireLayoutContext(specs, svgBox, getNode);
}

/** Test helper — reset module cache between cases. */
export function resetWireLayoutCache(): void {
  elFanCounter = 0;
}
