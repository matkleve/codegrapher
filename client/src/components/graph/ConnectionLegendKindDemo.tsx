import { useState } from "react";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";
import {
  legendSwatchClasses,
  wireStyleForKind,
  type LegendConnectionKind,
} from "@/lib/connectionWireStyle";
import { cn } from "@/lib/utils";

const VB_W = 280;
const VB_H = 120;

type DemoChip = {
  id: string;
  label: string;
  role: "def" | "usage" | "type" | "branch" | "plain";
};

type DemoMember = {
  id: string;
  title: string;
  titleChipId?: string;
  /** Inline code fragments; only listed ids are interactive chips. */
  code?: { text: string; chipId?: string }[];
};

type DemoCard = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  titleChipId?: string;
  variant: "class" | "interface" | "module";
  members?: DemoMember[];
};

type DemoLayout = {
  cards: DemoCard[];
  chips: Record<string, DemoChip>;
  /** Chip center in viewBox coords — wire endpoints. */
  anchors: Record<string, { x: number; y: number }>;
  pathD: string;
  markerEnd?: boolean;
  markerStart?: boolean;
  junction?: { x: number; y: number };
};

const DEMO: Record<LegendConnectionKind, DemoLayout> = {
  usage: {
    cards: [
      {
        id: "def-card",
        x: 6,
        y: 10,
        w: 118,
        h: 100,
        title: "OrderService",
        variant: "class",
        members: [
          { id: "m1", title: "extractFieldValue", titleChipId: "def", code: [{ text: "…" }] },
        ],
      },
      {
        id: "use-card",
        x: 156,
        y: 10,
        w: 118,
        h: 100,
        title: "PaymentGateway",
        variant: "class",
        members: [
          {
            id: "m2",
            title: "process",
            code: [
              { text: "return " },
              { text: "extractFieldValue", chipId: "usage" },
              { text: "(field)" },
            ],
          },
        ],
      },
    ],
    chips: {
      def: { id: "def", label: "extractFieldValue", role: "def" },
      usage: { id: "usage", label: "extractFieldValue", role: "usage" },
    },
    anchors: { def: { x: 62, y: 48 }, usage: { x: 218, y: 48 } },
    pathD: "M 78 48 C 118 24, 162 24, 202 48",
  },
  binding: {
    cards: [
      {
        id: "bind-card",
        x: 36,
        y: 8,
        w: 208,
        h: 104,
        title: "extractFieldValue",
        variant: "class",
        members: [
          {
            id: "m1",
            title: "extractFieldValue",
            code: [
              { text: "const " },
              { text: "addr", chipId: "bind" },
              { text: " = " },
              { text: "result.address", chipId: "init" },
            ],
          },
        ],
      },
    ],
    chips: {
      init: { id: "init", label: "result.address", role: "usage" },
      bind: { id: "bind", label: "addr", role: "def" },
    },
    anchors: { init: { x: 188, y: 52 }, bind: { x: 108, y: 52 } },
    pathD: "M 168 52 C 148 34, 128 34, 118 52",
  },
  typesetting: {
    cards: [
      {
        id: "type-card",
        x: 36,
        y: 8,
        w: 208,
        h: 104,
        title: "extractFieldValue",
        variant: "class",
        members: [
          {
            id: "m1",
            title: "extractFieldValue",
            code: [
              { text: "(" },
              { text: "field", chipId: "param" },
              { text: ": " },
              { text: "AddressFieldKind", chipId: "sig-type" },
              { text: ")" },
            ],
          },
        ],
      },
    ],
    chips: {
      param: { id: "param", label: "field", role: "def" },
      "sig-type": { id: "sig-type", label: "AddressFieldKind", role: "type" },
    },
    anchors: { "sig-type": { x: 198, y: 52 }, param: { x: 98, y: 52 } },
    pathD: "M 182 52 L 182 28 Q 182 22 176 22 L 112 22 Q 106 22 106 28 L 106 52",
    markerStart: true,
  },
  branch: {
    cards: [
      {
        id: "branch-card",
        x: 36,
        y: 8,
        w: 208,
        h: 104,
        title: "extractFieldValue",
        variant: "class",
        members: [
          {
            id: "m1",
            title: "extractFieldValue",
            code: [
              { text: "switch (" },
              { text: "field", chipId: "trunk" },
              { text: ") {" },
            ],
          },
        ],
      },
    ],
    chips: {
      trunk: { id: "trunk", label: "switch", role: "branch" },
      caseA: { id: "caseA", label: "case A", role: "branch" },
      caseB: { id: "caseB", label: "case B", role: "branch" },
    },
    anchors: { trunk: { x: 108, y: 52 }, caseA: { x: 228, y: 34 }, caseB: { x: 228, y: 72 } },
    pathD: "M 118 52 L 118 42 L 148 42 L 148 34 L 212 34 M 148 42 L 148 72 L 212 72",
    junction: { x: 148, y: 42 },
  },
  inheritance: {
    cards: [
      {
        id: "base",
        x: 6,
        y: 18,
        w: 118,
        h: 84,
        title: "BaseService",
        titleChipId: "base",
        variant: "class",
        members: [{ id: "m1", title: "run", code: [{ text: "run()" }] }],
      },
      {
        id: "child",
        x: 156,
        y: 18,
        w: 118,
        h: 84,
        title: "OrderService",
        titleChipId: "child",
        variant: "class",
        members: [{ id: "m2", title: "run", code: [{ text: "super.run()" }] }],
      },
    ],
    chips: {
      base: { id: "base", label: "BaseService", role: "def" },
      child: { id: "child", label: "OrderService", role: "usage" },
    },
    anchors: { base: { x: 62, y: 28 }, child: { x: 218, y: 28 } },
    pathD: "M 78 28 C 118 12, 162 12, 202 28",
  },
  implementation: {
    cards: [
      {
        id: "iface",
        x: 6,
        y: 18,
        w: 118,
        h: 84,
        title: "IRepository",
        titleChipId: "iface",
        variant: "interface",
        members: [{ id: "m1", title: "find", code: [{ text: "find(): T" }] }],
      },
      {
        id: "impl",
        x: 156,
        y: 18,
        w: 118,
        h: 84,
        title: "Repository",
        titleChipId: "impl",
        variant: "class",
        members: [{ id: "m2", title: "find", code: [{ text: "find(): T" }] }],
      },
    ],
    chips: {
      iface: { id: "iface", label: "IRepository", role: "def" },
      impl: { id: "impl", label: "Repository", role: "usage" },
    },
    anchors: { iface: { x: 62, y: 28 }, impl: { x: 218, y: 28 } },
    pathD: "M 78 28 C 118 12, 162 12, 202 28",
  },
  composition: {
    cards: [
      {
        id: "dep",
        x: 6,
        y: 18,
        w: 118,
        h: 84,
        title: "PaymentGateway",
        titleChipId: "dep",
        variant: "class",
        members: [{ id: "m1", title: "charge", code: [{ text: "charge()" }] }],
      },
      {
        id: "owner",
        x: 156,
        y: 18,
        w: 118,
        h: 84,
        title: "OrderService",
        variant: "class",
        members: [
          {
            id: "m2",
            title: "constructor",
            code: [{ text: "gateway", chipId: "dep-inject" }],
          },
        ],
      },
    ],
    chips: {
      dep: { id: "dep", label: "PaymentGateway", role: "def" },
      "dep-inject": { id: "dep-inject", label: "gateway", role: "usage" },
    },
    anchors: { dep: { x: 62, y: 28 }, "dep-inject": { x: 218, y: 48 } },
    pathD: "M 78 32 C 118 40, 162 44, 202 48",
  },
  "module-import": {
    cards: [
      {
        id: "helpers",
        x: 6,
        y: 22,
        w: 118,
        h: 76,
        title: "helpers.ts",
        variant: "module",
        members: [{ id: "m1", title: "formatDate", code: [{ text: "export formatDate" }] }],
      },
      {
        id: "order",
        x: 156,
        y: 22,
        w: 118,
        h: 76,
        title: "order.ts",
        variant: "module",
        members: [
          {
            id: "m2",
            title: "order.ts",
            code: [
              { text: "import { " },
              { text: "formatDate", chipId: "import-use" },
              { text: " }" },
            ],
          },
        ],
      },
    ],
    chips: {
      "import-def": { id: "import-def", label: "formatDate", role: "def" },
      "import-use": { id: "import-use", label: "formatDate", role: "usage" },
    },
    anchors: { "import-def": { x: 62, y: 40 }, "import-use": { x: 218, y: 40 } },
    pathD: "M 78 40 C 118 22, 162 22, 202 40",
  },
};

type ConnectionLegendKindDemoProps = {
  kind: LegendConnectionKind;
  active: boolean;
};

function DemoChipButton({
  chipId,
  chip,
  litId,
  onChipClick,
  className,
}: {
  chipId: string;
  chip: DemoChip;
  litId: string | null;
  onChipClick: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "connection-legend-demo-chip",
        `connection-legend-demo-chip--${chip.role}`,
        litId === chipId && "connection-legend-demo-chip--lit",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onChipClick(chipId);
      }}
    >
      {chip.label}
    </button>
  );
}

function DemoCardView({
  card,
  layout,
  litId,
  onChipClick,
}: {
  card: DemoCard;
  layout: DemoLayout;
  litId: string | null;
  onChipClick: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "connection-legend-demo-card",
        `connection-legend-demo-card--${card.variant}`,
      )}
      style={{
        left: `${(card.x / VB_W) * 100}%`,
        top: `${(card.y / VB_H) * 100}%`,
        width: `${(card.w / VB_W) * 100}%`,
        height: `${(card.h / VB_H) * 100}%`,
      }}
    >
      <div className="connection-legend-demo-card-header">
        {card.titleChipId && layout.chips[card.titleChipId] ? (
          <DemoChipButton
            chipId={card.titleChipId}
            chip={layout.chips[card.titleChipId]}
            litId={litId}
            onChipClick={onChipClick}
            className="connection-legend-demo-chip--header"
          />
        ) : (
          card.title
        )}
      </div>
      {card.members?.map((member) => (
        <div key={member.id} className="connection-legend-demo-member">
          <div className="connection-legend-demo-member-title">
            {member.titleChipId && layout.chips[member.titleChipId] ? (
              <DemoChipButton
                chipId={member.titleChipId}
                chip={layout.chips[member.titleChipId]}
                litId={litId}
                onChipClick={onChipClick}
              />
            ) : (
              member.title
            )}
          </div>
          {member.code ? (
            <div className="connection-legend-demo-code">
              {member.code.map((part, i) => {
                if (!part.chipId) {
                  return (
                    <span key={`${member.id}-${i}`} className="connection-legend-demo-plain">
                      {part.text}
                    </span>
                  );
                }
                const chip = layout.chips[part.chipId];
                if (!chip) return null;
                return (
                  <DemoChipButton
                    key={part.chipId}
                    chipId={part.chipId}
                    chip={chip}
                    litId={litId}
                    onChipClick={onChipClick}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ConnectionLegendKindDemo({
  kind,
  active,
}: ConnectionLegendKindDemoProps) {
  const [litId, setLitId] = useState<string | null>(null);
  const def = wireStyleForKind(kind);
  const layout = DEMO[kind];
  const pathClass = legendSwatchClasses(kind, { pulse: false }).join(" ");

  const branchLabels =
    kind === "branch"
      ? ([
          { id: "caseA", label: "case A", x: 228, y: 34 },
          { id: "caseB", label: "case B", x: 228, y: 72 },
        ] as const)
      : [];

  return (
    <div
      className={cn(
        "connection-legend-demo",
        !active && "connection-legend-demo--inactive",
      )}
      aria-hidden
    >
      <div className="connection-legend-demo-grid" />
      <svg className="connection-legend-demo-svg" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <defs>
          <WireMarkerDefs />
        </defs>
        <path
          d={layout.pathD}
          fill="none"
          className={cn("connection-legend-demo-wire", pathClass)}
          stroke={def.stroke}
          markerEnd={layout.markerEnd !== false ? `url(#${def.markerId})` : undefined}
          markerStart={
            layout.markerStart && def.markerStartId
              ? `url(#${def.markerStartId})`
              : undefined
          }
        />
        {layout.junction ? (
          <circle
            cx={layout.junction.x}
            cy={layout.junction.y}
            r={3}
            className="preview-edge-junction"
            fill={def.stroke}
          />
        ) : null}
      </svg>
      <div className="connection-legend-demo-stage">
        {layout.cards.map((card) => (
          <DemoCardView
            key={card.id}
            card={card}
            layout={layout}
            litId={litId}
            onChipClick={(id) => setLitId((prev) => (prev === id ? null : id))}
          />
        ))}
        {branchLabels.map((branch) => (
          <button
            key={branch.id}
            type="button"
            className={cn(
              "connection-legend-demo-branch-tag",
              litId === branch.id && "connection-legend-demo-chip--lit",
            )}
            style={{
              left: `${(branch.x / VB_W) * 100}%`,
              top: `${(branch.y / VB_H) * 100}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setLitId((prev) => (prev === branch.id ? null : branch.id));
            }}
          >
            {branch.label}
          </button>
        ))}
      </div>
    </div>
  );
}
