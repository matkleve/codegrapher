import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import {
  computeActiveConnectionKinds,
  computePulsingConnectionKinds,
  CONNECTION_KIND_LABEL,
  LEGEND_CONNECTION_KINDS,
  legendSwatchClasses,
  wireStyleForKind,
  type LegendConnectionKind,
} from "@/lib/connectionWireStyle";
import { cn } from "@/lib/utils";

function LegendSwatch({
  kind,
  visible,
  firing,
  pulse,
}: {
  kind: LegendConnectionKind;
  visible: boolean;
  firing: boolean;
  pulse: boolean;
}) {
  const def = wireStyleForKind(kind);
  const pathClass = legendSwatchClasses(kind, { pulse }).join(" ");

  return (
    <svg
      className={cn(
        "connection-legend-swatch",
        !visible && "connection-legend-swatch--inactive opacity-45",
        visible && !firing && "connection-legend-swatch--idle opacity-80",
        visible && firing && "connection-legend-swatch--firing",
      )}
      viewBox="0 0 44 12"
      aria-hidden
    >
      <defs>
        <WireMarkerDefs />
      </defs>
      <line
        x1={0}
        y1={6}
        x2={36}
        y2={6}
        className={cn("connection-legend-swatch-line", pathClass)}
        stroke={def.stroke}
        markerEnd={`url(#${def.markerId})`}
      />
    </svg>
  );
}

export function ConnectionLegend() {
  const {
    isEdgeKindVisible,
    toggleEdgeKind,
    previewEdges,
    structuralEdges,
    pulseEdges,
  } = useGraphInteraction();
  const [open, setOpen] = useState(false);

  const activeKinds = useMemo(
    () => computeActiveConnectionKinds(previewEdges, structuralEdges, pulseEdges),
    [previewEdges, structuralEdges, pulseEdges],
  );

  const pulsingKinds = useMemo(
    () => computePulsingConnectionKinds(pulseEdges),
    [pulseEdges],
  );

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
            {LEGEND_CONNECTION_KINDS.map((kind) => {
              const visible = isEdgeKindVisible(kind);
              const firing = open && activeKinds.has(kind);
              return (
                <li key={kind}>
                  <InteractiveListRow
                    interactive
                    density="compact"
                    contentTone={visible ? "default" : "muted"}
                    className={cn(firing && "connection-legend-row--firing")}
                    title={CONNECTION_KIND_LABEL[kind]}
                    aria-pressed={visible}
                    onClick={() => toggleEdgeKind(kind)}
                    leading={
                      <LegendSwatch
                        kind={kind}
                        visible={visible}
                        firing={firing}
                        pulse={pulsingKinds.has(kind)}
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
