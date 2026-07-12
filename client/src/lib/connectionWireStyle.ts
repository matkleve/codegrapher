import { previewConnectionKind } from "@/lib/connectionVisibility";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { StructuralEdgeType } from "@/types";

export type ConnectionKind =
  | "usage"
  | "binding"
  | "branch"
  | "transitive"
  | "inheritance"
  | "implementation"
  | "composition"
  | "override"
  | "shared-dependency"
  | "module-import";

/** Kinds shown in the connection legend (excludes transitive / sim-only kinds). */
export type LegendConnectionKind = Exclude<
  ConnectionKind,
  "transitive" | "override" | "shared-dependency"
>;

export const LEGEND_CONNECTION_KINDS: readonly LegendConnectionKind[] = [
  "usage",
  "binding",
  "branch",
  "inheritance",
  "implementation",
  "composition",
  "module-import",
];

export type WireMarkerId =
  | "wire-arrow-open"
  | "structural-arrow-triangle"
  | "structural-arrow-diamond";

export type StructuralStrokeStyle = "solid" | "dotted";
export type StructuralArrowhead = "triangle-hollow" | "diamond-filled" | "open";

type WireStyleDef = {
  label: string;
  layer: "preview" | "structural";
  stroke: string;
  pathClasses: readonly string[];
  markerId: WireMarkerId;
  /** Preview kinds: legend always uses warm trace motion (same speed as map). */
  legendFlow: boolean;
  /** Dotted structural kinds: legend marches the dash pattern (map is static unless pulse). */
  legendDottedFlow: boolean;
};

export const CONNECTION_KIND_LABEL: Record<ConnectionKind, string> = {
  usage: "Usage",
  binding: "Binding",
  branch: "Control flow",
  transitive: "Transitive",
  inheritance: "Inheritance",
  implementation: "Implementation",
  composition: "Composition",
  override: "Override",
  "shared-dependency": "Shared dependency",
  "module-import": "Module import",
};

const WIRE_STYLE: Record<LegendConnectionKind, WireStyleDef> = {
  usage: {
    label: "Usage",
    layer: "preview",
    stroke: "var(--edge-usage)",
    pathClasses: ["preview-edge-path"],
    markerId: "wire-arrow-open",
    legendFlow: true,
    legendDottedFlow: false,
  },
  binding: {
    label: "Binding",
    layer: "preview",
    stroke: "var(--edge-binding)",
    pathClasses: ["preview-edge-path", "preview-edge-binding"],
    markerId: "wire-arrow-open",
    legendFlow: true,
    legendDottedFlow: false,
  },
  branch: {
    label: "Control flow",
    layer: "preview",
    stroke: "var(--edge-control-flow)",
    pathClasses: ["preview-edge-path", "preview-edge-branch"],
    markerId: "wire-arrow-open",
    legendFlow: true,
    legendDottedFlow: false,
  },
  inheritance: {
    label: "Inheritance",
    layer: "structural",
    stroke: "var(--edge-inheritance)",
    pathClasses: ["structural-edge-path", "structural-edge-path--solid"],
    markerId: "structural-arrow-triangle",
    legendFlow: false,
    legendDottedFlow: false,
  },
  implementation: {
    label: "Implementation",
    layer: "structural",
    stroke: "var(--edge-implementation)",
    pathClasses: ["structural-edge-path", "structural-edge-path--dotted"],
    markerId: "structural-arrow-triangle",
    legendFlow: false,
    legendDottedFlow: true,
  },
  composition: {
    label: "Composition",
    layer: "structural",
    stroke: "var(--edge-composition)",
    pathClasses: ["structural-edge-path", "structural-edge-path--solid"],
    markerId: "structural-arrow-diamond",
    legendFlow: false,
    legendDottedFlow: false,
  },
  "module-import": {
    label: "Module import",
    layer: "structural",
    stroke: "var(--edge-import)",
    pathClasses: [
      "structural-edge-path",
      "structural-edge-path--dotted",
      "structural-edge-path--imports",
    ],
    markerId: "wire-arrow-open",
    legendFlow: false,
    legendDottedFlow: true,
  },
};

/** Persistent structural edge strokes — theme-aware via CSS variables. */
export const STRUCTURAL_EDGE_STROKE: Record<StructuralEdgeType, string> = {
  extends: WIRE_STYLE.inheritance.stroke,
  implements: WIRE_STYLE.implementation.stroke,
  composition: WIRE_STYLE.composition.stroke,
  imports: WIRE_STYLE["module-import"].stroke,
};

export const STRUCTURAL_EDGE_STYLE: Record<
  StructuralEdgeType,
  { strokeStyle: StructuralStrokeStyle; arrowhead: StructuralArrowhead }
> = {
  extends: { strokeStyle: "solid", arrowhead: "triangle-hollow" },
  implements: { strokeStyle: "dotted", arrowhead: "triangle-hollow" },
  composition: { strokeStyle: "solid", arrowhead: "diamond-filled" },
  imports: { strokeStyle: "dotted", arrowhead: "open" },
};

export function wireStyleForKind(kind: LegendConnectionKind): WireStyleDef {
  return WIRE_STYLE[kind];
}

export function graphEdgeToConnectionKind(
  type: StructuralEdgeType,
): LegendConnectionKind {
  switch (type) {
    case "extends":
      return "inheritance";
    case "implements":
      return "implementation";
    case "composition":
      return "composition";
    case "imports":
      return "module-import";
  }
}

export function structuralMarkerId(arrowhead: StructuralArrowhead): WireMarkerId {
  switch (arrowhead) {
    case "triangle-hollow":
      return "structural-arrow-triangle";
    case "diamond-filled":
      return "structural-arrow-diamond";
    case "open":
      return "wire-arrow-open";
  }
}

export function previewWireMarkerId(): WireMarkerId {
  return "wire-arrow-open";
}

export function legendSwatchClasses(
  kind: LegendConnectionKind,
  opts: { pulse: boolean },
): string[] {
  const def = WIRE_STYLE[kind];
  const classes = [...def.pathClasses];
  if (def.legendFlow) {
    classes.push("preview-edge-warm");
  }
  if (opts.pulse) {
    classes.push("structural-edge-path--pulse");
  }
  if (def.legendDottedFlow && !opts.pulse) {
    classes.push("connection-legend-swatch-line--dotted-flow");
  }
  return classes;
}

export function previewWireClasses(
  spec: PreviewEdgeSpec,
  warm: boolean,
): { path: string[]; glow: string[] } {
  const path = ["preview-edge-path"];
  const glow = ["preview-edge-glow"];

  if (spec.load) path.push("preview-edge-load");
  if (spec.connectionKind === "binding") {
    path.push("preview-edge-binding");
    glow.push("preview-edge-binding");
  }
  if (spec.connectionKind === "branch") {
    path.push("preview-edge-branch");
    glow.push("preview-edge-branch");
  }
  if (warm) {
    path.push("preview-edge-warm");
    glow.push("preview-edge-warm");
  }
  if (spec.hop === 2) {
    path.push("preview-wire--hop2");
    glow.push("preview-wire--hop2");
  }
  if (spec.hop === 3) {
    path.push("preview-wire--hop3");
    glow.push("preview-wire--hop3");
  }

  return { path, glow };
}

export function previewWireStroke(spec: PreviewEdgeSpec): string {
  if (spec.connectionKind === "branch") return "var(--edge-control-flow)";
  if (spec.connectionKind === "binding") return "var(--edge-binding)";
  return "var(--edge-usage)";
}

export function structuralWireClasses(spec: StructuralEdgeSpec): string[] {
  const kind = graphEdgeToConnectionKind(spec.edgeType);
  const classes = [...wireStyleForKind(kind).pathClasses];
  if (spec.pulse) classes.push("structural-edge-path--pulse");
  if (spec.opacity != null && spec.opacity < 1) {
    classes.push("structural-edge-path--faded");
  }
  return classes;
}

/** Kinds with at least one wire on the overlay right now. */
export function computeActiveConnectionKinds(
  previewEdges: readonly PreviewEdgeSpec[],
  structuralEdges: readonly StructuralEdgeSpec[],
  pulseEdges: readonly StructuralEdgeSpec[],
): ReadonlySet<LegendConnectionKind> {
  const active = new Set<LegendConnectionKind>();

  for (const edge of previewEdges) {
    const kind = previewConnectionKind(edge);
    if (kind === "transitive") active.add("usage");
    else active.add(kind);
  }

  for (const edge of structuralEdges) {
    active.add(graphEdgeToConnectionKind(edge.edgeType));
  }

  for (const edge of pulseEdges) {
    active.add(graphEdgeToConnectionKind(edge.edgeType));
  }

  return active;
}

/** Kinds currently pulsing during simulation (legend mirrors map pulse). */
export function computePulsingConnectionKinds(
  pulseEdges: readonly StructuralEdgeSpec[],
): ReadonlySet<LegendConnectionKind> {
  const pulsing = new Set<LegendConnectionKind>();
  for (const edge of pulseEdges) {
    if (edge.pulse) pulsing.add(graphEdgeToConnectionKind(edge.edgeType));
  }
  return pulsing;
}
