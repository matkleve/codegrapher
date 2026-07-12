import {
  getWireLayoutContext,
  resolveWireEndpoints,
} from "@/lib/wireFanLayout";
import type { DemoWireSpec } from "@/hooks/useLegendDemoWire";
import {
  cubicPath,
  resolvePreviewAnchor,
  resolveTypesettingAnchors,
} from "@/lib/resolvePreviewAnchor";
import type { PreviewConnectionKind, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import {
  branchJunctionPoint,
  previewWirePath,
} from "@/lib/wirePaths";

export type LegendDemoWireLayout = {
  paths: string[];
  junction: { x: number; y: number } | null;
};

const EMPTY: LegendDemoWireLayout = { paths: [], junction: null };

function resolveDemoEl(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-demo-anchor="${id}"]`);
}

function previewSpecsForBranch(
  spec: Extract<DemoWireSpec, { mode: "branch" }>,
  root: HTMLElement,
): PreviewEdgeSpec[] | null {
  const fromEl = resolveDemoEl(root, spec.from.id);
  if (!fromEl) return null;

  const targets = spec.to
    .map((target) => {
      const el = resolveDemoEl(root, target.id);
      if (!el) return null;
      return { el, side: target.toSide };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (targets.length === 0) return null;

  return targets.map((target, index) => ({
    id: `legend-demo-branch-${index}`,
    from: {
      type: "element",
      el: fromEl,
      side: spec.from.fromSide ?? "right",
    },
    to: {
      type: "element",
      el: target.el,
      side: target.side ?? "left",
    },
    kind: "variable",
    connectionKind: "branch",
    branchFan:
      targets.length > 1
        ? { groupId: "legend-demo", index, count: targets.length }
        : undefined,
  }));
}

function previewSpecForPair(
  id: string,
  connectionKind: PreviewConnectionKind,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  fromSide?: "left" | "right",
  toSide?: "left" | "right",
): PreviewEdgeSpec {
  return {
    id,
    from: { type: "element", el: fromEl, side: fromSide },
    to: { type: "element", el: toEl, side: toSide },
    kind: "variable",
    connectionKind,
  };
}

function demoWireToPreviewSpecs(
  spec: DemoWireSpec,
  root: HTMLElement,
): PreviewEdgeSpec[] | null {
  if (spec.mode === "branch") {
    return previewSpecsForBranch(spec, root);
  }

  const fromEl = resolveDemoEl(root, spec.from.id);
  const toEl = resolveDemoEl(root, spec.to.id);
  if (!fromEl || !toEl) return null;

  if (spec.mode === "preview") {
    return [
      previewSpecForPair(
        "legend-demo-preview",
        spec.kind,
        fromEl,
        toEl,
        spec.from.fromSide,
        spec.to.toSide,
      ),
    ];
  }

  return [
    {
      id: "legend-demo-structural",
      from: { type: "element", el: fromEl, side: spec.from.fromSide ?? "right" },
      to: { type: "element", el: toEl, side: spec.to.toSide ?? "left" },
      kind: "class",
    },
  ];
}

function structuralPath(
  spec: Extract<DemoWireSpec, { mode: "structural" }>,
  root: HTMLElement,
  svgBox: DOMRect,
): string | null {
  const fromEl = resolveDemoEl(root, spec.from.id);
  const toEl = resolveDemoEl(root, spec.to.id);
  if (!fromEl || !toEl) return null;

  const fromSide = spec.from.fromSide ?? "right";
  const toSide = spec.to.toSide ?? "left";
  const fromPt = resolvePreviewAnchor(
    { type: "element", el: fromEl, side: fromSide },
    svgBox,
    "from",
  );
  const toPt = resolvePreviewAnchor(
    { type: "element", el: toEl, side: toSide },
    svgBox,
    "to",
  );
  if (!fromPt || !toPt) return null;

  return cubicPath(fromPt.x, fromPt.y, toPt.x, toPt.y, fromPt.side, toPt.side, {
    clearance: 18,
  });
}

function branchJunctionForSpecs(
  specs: PreviewEdgeSpec[],
  svgBox: DOMRect,
): { x: number; y: number } | null {
  const head = specs[0];
  if (!head || head.connectionKind !== "branch") return null;

  const row = resolveWireEndpoints(head, svgBox, () => undefined);
  if (!row) return null;

  const spurs = specs
    .map((edgeSpec) => resolveWireEndpoints(edgeSpec, svgBox, () => undefined))
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .map((entry) => ({
      x2: entry.toPt.x,
      y2: entry.toPt.y,
      toEl: entry.toPt.el,
    }));

  return branchJunctionPoint(
    row.fromPt.x,
    row.fromPt.y,
    row.fromPt.el,
    spurs,
    svgBox,
  );
}

export function layoutLegendDemoWires(
  spec: DemoWireSpec,
  root: HTMLElement,
  svgBox: DOMRect,
): LegendDemoWireLayout {
  if (svgBox.width <= 0 || svgBox.height <= 0) return EMPTY;

  if (spec.mode === "structural") {
    const path = structuralPath(spec, root, svgBox);
    return path ? { paths: [path], junction: null } : EMPTY;
  }

  const previewSpecs = demoWireToPreviewSpecs(spec, root);
  if (!previewSpecs?.length) return EMPTY;

  const layoutCtx = getWireLayoutContext(previewSpecs, svgBox, () => undefined);
  const paths: string[] = [];

  for (const edgeSpec of previewSpecs) {
    const fanLayout = layoutCtx.fanMembers.get(edgeSpec.id);
    if (fanLayout) {
      paths.push(fanLayout.pathD);
      continue;
    }

    const row = resolveWireEndpoints(edgeSpec, svgBox, () => undefined);
    if (!row) continue;

    if (edgeSpec.connectionKind === "typesetting") {
      const anchorPair = resolveTypesettingAnchors(
        row.spec.from,
        row.spec.to,
        svgBox,
      );
      const fromPt = anchorPair?.fromPt ?? row.fromPt;
      const toPt = anchorPair?.toPt ?? row.toPt;
      paths.push(
        previewWirePath({
          connectionKind: "typesetting",
          x1: fromPt.x,
          y1: fromPt.y,
          x2: toPt.x,
          y2: toPt.y,
          fromSide: fromPt.side,
          toSide: toPt.side,
          fromEl: fromPt.el,
          toEl: toPt.el,
          svgBox,
          lane: layoutCtx.lanes.get(edgeSpec.id) ?? 0,
        }),
      );
      continue;
    }

    paths.push(
      previewWirePath({
        connectionKind: edgeSpec.connectionKind ?? "usage",
        x1: row.fromPt.x,
        y1: row.fromPt.y,
        x2: row.toPt.x,
        y2: row.toPt.y,
        fromSide: row.fromPt.side,
        toSide: row.toPt.side,
        fromEl: row.fromPt.el,
        toEl: row.toPt.el,
        svgBox,
        lane: layoutCtx.lanes.get(edgeSpec.id) ?? 0,
      }),
    );
  }

  const junction =
    spec.mode === "branch" ? branchJunctionForSpecs(previewSpecs, svgBox) : null;

  return { paths, junction };
}
