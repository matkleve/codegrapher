import type { DemoWireSpec } from "@/hooks/useLegendDemoWire";
import type { LegendConnectionKind } from "@/lib/connectionWireStyle";
import legendDemoScenesJson from "@fixtures/legend-demo-scenes.json";

export type DemoCodePart = {
  text: string;
  anchorId?: string;
  tokenKind?: string;
  tone?: "kw" | "pn";
};

export type DemoCodeLineScene = {
  lineNo?: number;
  parts: DemoCodePart[];
};

export type DemoMemberScene = {
  id: string;
  label: string;
  labelAnchorId?: string;
  labelTokenKind?: "function" | "class" | "type" | "variable";
  signature?: DemoCodePart[];
  body?: DemoCodeLineScene[];
};

export type DemoCardScene = {
  id: string;
  title: string;
  titleAnchorId?: string;
  variant: "class" | "interface" | "module";
  members: DemoMemberScene[];
};

export type DemoScene = {
  layout: "split" | "solo";
  cards: DemoCardScene[];
  wire: DemoWireSpec;
};

export const LEGEND_DEMO_SCENES = legendDemoScenesJson as Record<
  LegendConnectionKind,
  DemoScene
>;

export function demoAnchorSockets(
  spec: DemoWireSpec,
): Map<string, { left: boolean; right: boolean }> {
  const map = new Map<string, { left: boolean; right: boolean }>();

  const mark = (id: string, side: "left" | "right") => {
    const entry = map.get(id) ?? { left: false, right: false };
    if (side === "left") entry.left = true;
    else entry.right = true;
    map.set(id, entry);
  };

  if (spec.mode === "branch") {
    mark(spec.from.id, spec.from.fromSide ?? "right");
    for (const target of spec.to) {
      mark(target.id, target.toSide ?? "left");
    }
    return map;
  }

  mark(spec.from.id, spec.from.fromSide ?? "right");
  mark(spec.to.id, spec.to.toSide ?? "left");
  return map;
}
