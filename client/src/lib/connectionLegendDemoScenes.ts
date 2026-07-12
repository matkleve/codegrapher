import type { DemoWireSpec } from "@/hooks/useLegendDemoWire";
import type { LegendConnectionKind } from "@/lib/connectionWireStyle";

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

export const LEGEND_DEMO_SCENES: Record<LegendConnectionKind, DemoScene> = {
  usage: {
    layout: "split",
    cards: [
      {
        id: "def-card",
        title: "Order Service",
        variant: "class",
        members: [
          {
            id: "m-def",
            label: "extract Field Value",
            labelAnchorId: "def",
            labelTokenKind: "function",
          },
        ],
      },
      {
        id: "use-card",
        title: "Payment Gateway",
        variant: "class",
        members: [
          {
            id: "m-use",
            label: "process",
            labelTokenKind: "function",
            body: [
              {
                parts: [
                  { text: "return ", tone: "kw" },
                  { text: "extractFieldValue", anchorId: "usage", tokenKind: "function" },
                  { text: "(field)" },
                ],
              },
            ],
          },
        ],
      },
    ],
    wire: {
      mode: "preview",
      kind: "usage",
      from: { id: "def", fromSide: "right" },
      to: { id: "usage", toSide: "left" },
    },
  },
  binding: {
    layout: "solo",
    cards: [
      {
        id: "bind-card",
        title: "Order Service",
        variant: "class",
        members: [
          {
            id: "m-bind",
            label: "extract Field Value",
            labelTokenKind: "function",
            body: [
              {
                parts: [
                  { text: "const ", tone: "kw" },
                  { text: "addr", anchorId: "bind", tokenKind: "variable" },
                  { text: " = " },
                  { text: "result.address", anchorId: "init", tokenKind: "variable" },
                ],
              },
            ],
          },
        ],
      },
    ],
    wire: {
      mode: "preview",
      kind: "binding",
      from: { id: "init", fromSide: "right" },
      to: { id: "bind", toSide: "left" },
    },
  },
  typesetting: {
    layout: "solo",
    cards: [
      {
        id: "type-card",
        title: "Order Service",
        variant: "class",
        members: [
          {
            id: "m-type",
            label: "extract Field Value",
            labelTokenKind: "function",
            signature: [
              { text: "(" },
              { text: "field", anchorId: "param", tokenKind: "variable" },
              { text: ": " },
              { text: "AddressFieldKind", anchorId: "sig-type", tokenKind: "type" },
              { text: ")" },
            ],
          },
        ],
      },
    ],
    wire: {
      mode: "preview",
      kind: "typesetting",
      from: { id: "sig-type", fromSide: "right" },
      to: { id: "param", toSide: "left" },
    },
  },
  branch: {
    layout: "solo",
    cards: [
      {
        id: "branch-card",
        title: "Order Service",
        variant: "class",
        members: [
          {
            id: "m-branch",
            label: "extract Field Value",
            labelTokenKind: "function",
            body: [
              {
                lineNo: 1,
                parts: [
                  { text: "switch ", tone: "kw" },
                  { text: "(" },
                  { text: "field", anchorId: "trunk", tokenKind: "variable" },
                  { text: ") {" },
                ],
              },
              {
                lineNo: 2,
                parts: [
                  { text: "  ", tone: "pn" },
                  { text: "case", anchorId: "caseA", tokenKind: "variable", tone: "kw" },
                  { text: " A: break;" },
                ],
              },
              {
                lineNo: 3,
                parts: [
                  { text: "  ", tone: "pn" },
                  { text: "case", anchorId: "caseB", tokenKind: "variable", tone: "kw" },
                  { text: " B: break;" },
                ],
              },
              {
                lineNo: 4,
                parts: [{ text: "}" }],
              },
            ],
          },
        ],
      },
    ],
    wire: {
      mode: "branch",
      from: { id: "trunk", fromSide: "right" },
      to: [
        { id: "caseA", toSide: "left" },
        { id: "caseB", toSide: "left" },
      ],
    },
  },
  inheritance: {
    layout: "split",
    cards: [
      {
        id: "base",
        title: "Base Service",
        titleAnchorId: "base",
        variant: "class",
        members: [
          {
            id: "m1",
            label: "run",
            labelTokenKind: "function",
            body: [{ parts: [{ text: "run()" }] }],
          },
        ],
      },
      {
        id: "child",
        title: "Order Service",
        titleAnchorId: "child",
        variant: "class",
        members: [
          {
            id: "m2",
            label: "run",
            labelTokenKind: "function",
            body: [{ parts: [{ text: "super.run()" }] }],
          },
        ],
      },
    ],
    wire: {
      mode: "structural",
      from: { id: "child", fromSide: "left" },
      to: { id: "base", toSide: "right" },
    },
  },
  implementation: {
    layout: "split",
    cards: [
      {
        id: "iface",
        title: "I Repository",
        titleAnchorId: "iface",
        variant: "interface",
        members: [
          {
            id: "m1",
            label: "find",
            labelTokenKind: "function",
            body: [{ parts: [{ text: "find(): T" }] }],
          },
        ],
      },
      {
        id: "impl",
        title: "Repository",
        titleAnchorId: "impl",
        variant: "class",
        members: [
          {
            id: "m2",
            label: "find",
            labelTokenKind: "function",
            body: [{ parts: [{ text: "find(): T" }] }],
          },
        ],
      },
    ],
    wire: {
      mode: "structural",
      from: { id: "impl", fromSide: "left" },
      to: { id: "iface", toSide: "right" },
    },
  },
  composition: {
    layout: "split",
    cards: [
      {
        id: "dep",
        title: "Payment Gateway",
        titleAnchorId: "dep",
        variant: "class",
        members: [
          {
            id: "m1",
            label: "charge",
            labelTokenKind: "function",
            body: [{ parts: [{ text: "charge()" }] }],
          },
        ],
      },
      {
        id: "owner",
        title: "Order Service",
        variant: "class",
        members: [
          {
            id: "m2",
            label: "constructor",
            labelTokenKind: "function",
            body: [
              {
                parts: [{ text: "gateway", anchorId: "dep-inject", tokenKind: "variable" }],
              },
            ],
          },
        ],
      },
    ],
    wire: {
      mode: "structural",
      from: { id: "dep", fromSide: "right" },
      to: { id: "dep-inject", toSide: "left" },
    },
  },
  "module-import": {
    layout: "split",
    cards: [
      {
        id: "helpers",
        title: "helpers.ts",
        variant: "module",
        members: [
          {
            id: "m1",
            label: "format Date",
            labelAnchorId: "import-def",
            labelTokenKind: "function",
          },
        ],
      },
      {
        id: "order",
        title: "order.ts",
        variant: "module",
        members: [
          {
            id: "m2",
            label: "order.ts",
            body: [
              {
                parts: [
                  { text: "import ", tone: "kw" },
                  { text: "{ " },
                  { text: "formatDate", anchorId: "import-use", tokenKind: "function" },
                  { text: " }" },
                ],
              },
            ],
          },
        ],
      },
    ],
    wire: {
      mode: "preview",
      kind: "usage",
      from: { id: "import-def", fromSide: "right" },
      to: { id: "import-use", toSide: "left" },
    },
  },
};

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
