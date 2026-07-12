import { useMemo, useState } from "react";
import { Waypoints } from "lucide-react";
import { GraphMapControlButton } from "@/components/graph/GraphMapControlButton";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { INTERACTIVE_TOGGLE_ACTIVE } from "@/lib/controlTokens";
import {
  computeActiveConnectionKinds,
  computePulsingConnectionKinds,
  CONNECTION_KIND_DESCRIPTION,
  CONNECTION_KIND_LABEL,
  LEGEND_CONNECTION_KINDS,
  legendSwatchClasses,
  wireStyleForKind,
  type LegendConnectionKind,
} from "@/lib/connectionWireStyle";
import { cn } from "@/lib/utils";

type ConnectionLegendProps = {
  flashKey: string;
  activeFlashKey: string | null;
  onFlash: (key: string) => void;
};

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
      {def.legendPathD ? (
        <path
          d={def.legendPathD}
          fill="none"
          className={cn("connection-legend-swatch-line", pathClass)}
          stroke={def.stroke}
          markerEnd={`url(#${def.markerId})`}
        />
      ) : (
        <line
          x1={0}
          y1={6}
          x2={36}
          y2={6}
          className={cn("connection-legend-swatch-line", pathClass)}
          stroke={def.stroke}
          markerEnd={`url(#${def.markerId})`}
        />
      )}
    </svg>
  );
}

export function ConnectionLegend({
  flashKey,
  activeFlashKey,
  onFlash,
}: ConnectionLegendProps) {
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
      <GraphMapControlButton
        flashKey={flashKey}
        activeFlashKey={activeFlashKey}
        onFlash={onFlash}
        variant="secondary"
        className={open ? INTERACTIVE_TOGGLE_ACTIVE : undefined}
        title="Connection legend"
        aria-label="Connection legend"
        aria-expanded={open}
        aria-pressed={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Waypoints />
      </GraphMapControlButton>
      {open ? (
        <div
          className="connection-legend-panel absolute right-0 bottom-full z-50 mb-2 rounded-md border border-border bg-popover px-1 py-1 shadow-md"
          role="dialog"
          aria-label="Connection kinds"
        >
          <ul className="flex flex-col gap-0.5">
            {LEGEND_CONNECTION_KINDS.map((kind) => {
              const visible = isEdgeKindVisible(kind);
              const firing = activeKinds.has(kind);
              return (
                <li key={kind}>
                  <InteractiveListRow
                    interactive
                    density="comfortable"
                    hoverStyle="neutral"
                    contentTone={visible ? "default" : "muted"}
                    className={cn(
                      "connection-legend-row",
                      firing && "connection-legend-row--live",
                    )}
                    title={CONNECTION_KIND_LABEL[kind]}
                    subtitle={CONNECTION_KIND_DESCRIPTION[kind]}
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
      ) : null}
    </div>
  );
}
