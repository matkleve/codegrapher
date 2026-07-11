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

type LegendItem = {
  kind: ConnectionKind;
  pathClass: string;
  markerId: string;
  stroke: string;
};

const LEGEND_ITEMS: LegendItem[] = [
  {
    kind: "usage",
    pathClass: "preview-edge-path preview-edge-warm",
    markerId: "preview-edge-arrow",
    stroke: "var(--token-edge-function)",
  },
  {
    kind: "inheritance",
    pathClass: "structural-edge-path structural-edge-path--solid",
    markerId: "structural-arrow-triangle",
    stroke: "var(--edge-inheritance)",
  },
  {
    kind: "implementation",
    pathClass:
      "structural-edge-path structural-edge-path--dotted connection-legend-swatch--flow",
    markerId: "structural-arrow-triangle",
    stroke: "var(--edge-implementation)",
  },
  {
    kind: "composition",
    pathClass: "structural-edge-path structural-edge-path--solid",
    markerId: "structural-arrow-diamond",
    stroke: "var(--edge-composition)",
  },
  {
    kind: "module-import",
    pathClass:
      "structural-edge-path structural-edge-path--dotted structural-edge-path--imports connection-legend-swatch--flow",
    markerId: "structural-arrow-open",
    stroke: "var(--edge-import)",
  },
];

function LegendSwatch({ pathClass, markerId, stroke }: Omit<LegendItem, "kind">) {
  const uid = useId();
  const gradId = `legend-fade-grad${uid}`;
  const maskId = `legend-fade-mask${uid}`;

  return (
    <svg
      className="connection-legend-swatch shrink-0"
      width={44}
      height={12}
      viewBox="0 0 44 12"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={1}
          y1={6}
          x2={36}
          y2={6}
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.6" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.12" />
        </linearGradient>
        <mask id={maskId}>
          <line
            x1={1}
            y1={6}
            x2={36}
            y2={6}
            stroke={`url(#${gradId})`}
            strokeWidth={4}
          />
        </mask>
      </defs>
      <line
        x1={1}
        y1={6}
        x2={36}
        y2={6}
        className={pathClass}
        style={{ stroke }}
        markerEnd={`url(#${markerId})`}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export function ConnectionLegend() {
  const { showImports, setShowImports } = useGraphInteraction();
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
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-md border border-border bg-popover px-1.5 py-1.5 text-xs shadow-md">
          <ul className="flex flex-col gap-1">
            {LEGEND_ITEMS.map((item) => (
              <li key={item.kind}>
                <InteractiveListRow
                  interactive={false}
                  density="compact"
                  title={CONNECTION_KIND_LABEL[item.kind]}
                  leading={
                    <LegendSwatch
                      pathClass={item.pathClass}
                      markerId={item.markerId}
                      stroke={item.stroke}
                    />
                  }
                />
              </li>
            ))}
          </ul>
          <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-border px-2 py-1.5">
            <input
              type="checkbox"
              checked={showImports}
              onChange={(e) => setShowImports(e.target.checked)}
              className="accent-[color:var(--brand)]"
            />
            Show imports
          </label>
        </div>
      )}
    </div>
  );
}
