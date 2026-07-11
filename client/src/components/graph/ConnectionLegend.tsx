import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import {
  CONNECTION_KIND_LABEL,
  type ConnectionKind,
} from "@/lib/structuralEdgeColors";
import { cn } from "@/lib/utils";

type LegendArrowhead = "filled" | "hollow-triangle" | "diamond" | "open";

type LegendItem = {
  kind: ConnectionKind;
  pathClass: string;
  arrowhead: LegendArrowhead;
  stroke: string;
};

const LEGEND_ITEMS: LegendItem[] = [
  {
    kind: "usage",
    pathClass: "preview-edge-path preview-edge-warm",
    arrowhead: "filled",
    stroke: "var(--token-edge-function)",
  },
  {
    kind: "binding",
    pathClass:
      "preview-edge-path preview-edge-binding preview-edge-warm connection-legend-swatch--flow",
    arrowhead: "filled",
    stroke: "var(--edge-binding)",
  },
  {
    kind: "branch",
    pathClass:
      "preview-edge-path preview-edge-branch preview-edge-warm connection-legend-swatch--flow",
    arrowhead: "filled",
    stroke: "var(--edge-control-flow)",
  },
  {
    kind: "inheritance",
    pathClass: "structural-edge-path structural-edge-path--solid",
    arrowhead: "hollow-triangle",
    stroke: "var(--edge-inheritance)",
  },
  {
    kind: "implementation",
    pathClass:
      "structural-edge-path structural-edge-path--dotted connection-legend-swatch--flow",
    arrowhead: "hollow-triangle",
    stroke: "var(--edge-implementation)",
  },
  {
    kind: "composition",
    pathClass: "structural-edge-path structural-edge-path--solid",
    arrowhead: "diamond",
    stroke: "var(--edge-composition)",
  },
  {
    kind: "module-import",
    pathClass:
      "structural-edge-path structural-edge-path--dotted structural-edge-path--imports connection-legend-swatch--flow",
    arrowhead: "open",
    stroke: "var(--edge-import)",
  },
];

function LegendArrowMarker({
  id,
  arrowhead,
}: {
  id: string;
  arrowhead: LegendArrowhead;
}) {
  switch (arrowhead) {
    case "filled":
      return (
        <marker
          id={id}
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
        >
          <path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke" />
        </marker>
      );
    case "hollow-triangle":
      return (
        <marker
          id={id}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path
            d="M0,0 L8,4 L0,8 Z"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.2"
          />
        </marker>
      );
    case "diamond":
      return (
        <marker
          id={id}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,4 L4,0 L8,4 L4,8 Z" fill="context-stroke" />
        </marker>
      );
    case "open":
      return (
        <marker
          id={id}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path
            d="M0,0 L6,3 L0,6"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1"
          />
        </marker>
      );
  }
}

function LegendSwatch({
  pathClass,
  arrowhead,
  stroke,
  passive = false,
}: Omit<LegendItem, "kind"> & { passive?: boolean }) {
  const uid = useId();
  const gradId = `legend-fade-grad${uid}`;
  const markerId = `legend-marker${uid}`;

  return (
    <svg
      className={cn(
        "connection-legend-swatch",
        passive && "connection-legend-swatch--inactive opacity-45",
      )}
      viewBox="0 0 44 12"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={6}
          x2={30}
          y2={6}
        >
          <stop offset="0%" stopColor={stroke} />
          <stop offset="65%" stopColor={stroke} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.15} />
        </linearGradient>
        <LegendArrowMarker id={markerId} arrowhead={arrowhead} />
      </defs>
      <line
        x1={0}
        y1={6}
        x2={30}
        y2={6}
        className={pathClass}
        stroke={`url(#${gradId})`}
        markerEnd={`url(#${markerId})`}
        style={passive ? { animation: "none" } : undefined}
      />
    </svg>
  );
}

export function ConnectionLegend() {
  const { isEdgeKindVisible, toggleEdgeKind } = useGraphInteraction();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Connection legend"
      >
        Legend
        <ChevronDown
          data-icon="inline-end"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-md border border-border bg-popover px-1.5 py-1.5 shadow-md">
          <ul className="flex flex-col gap-1">
            {LEGEND_ITEMS.map((item) => {
              const visible = isEdgeKindVisible(item.kind);
              return (
                <li key={item.kind}>
                  <InteractiveListRow
                    interactive
                    density="compact"
                    contentTone={visible ? "default" : "muted"}
                    title={CONNECTION_KIND_LABEL[item.kind]}
                    aria-pressed={visible}
                    onClick={() => toggleEdgeKind(item.kind)}
                    leading={
                      <LegendSwatch
                        pathClass={item.pathClass}
                        arrowhead={item.arrowhead}
                        stroke={item.stroke}
                        passive={!visible}
                      />
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
