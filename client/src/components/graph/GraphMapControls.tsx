import { Crosshair, FileText, Grip, Maximize2 } from "lucide-react";
import { ConnectionLegend } from "@/components/graph/ConnectionLegend";
import { GraphMapControlSlot } from "@/components/graph/GraphMapControlSlot";
import { INTERACTIVE_TOGGLE_ACTIVE } from "@/lib/controlTokens";

type GraphMapControlsProps = {
  showGrid: boolean;
  mapControlFlash: string | null;
  hasReadingFocus: boolean;
  onFlash: (key: string) => void;
  onToggleGrid: () => void;
  onFocusReadingView: () => void;
  onCenterView: () => void;
  onFitToScreen: () => void;
};

export function GraphMapControls({
  showGrid,
  mapControlFlash,
  hasReadingFocus,
  onFlash,
  onToggleGrid,
  onFocusReadingView,
  onCenterView,
  onFitToScreen,
}: GraphMapControlsProps) {
  return (
    <div
      data-graph-control
      className="pointer-events-auto absolute right-3 bottom-3 z-30 flex flex-col gap-2"
    >
      <ConnectionLegend
        flashKey="legend"
        activeFlashKey={mapControlFlash}
        onFlash={onFlash}
      />
      <GraphMapControlSlot
        flashKey="grid"
        activeFlashKey={mapControlFlash}
        onFlash={onFlash}
        variant="secondary"
        className={showGrid ? INTERACTIVE_TOGGLE_ACTIVE : undefined}
        label={showGrid ? "Hide grid" : "Show grid"}
        icon={<Grip />}
        aria-pressed={showGrid}
        onClick={onToggleGrid}
      />
      <GraphMapControlSlot
        flashKey="reading"
        activeFlashKey={mapControlFlash}
        onFlash={onFlash}
        variant="secondary"
        disabled={!hasReadingFocus}
        label="Focus selection for reading"
        icon={<FileText />}
        labelTone={hasReadingFocus ? "default" : "passive"}
        onClick={onFocusReadingView}
      />
      <GraphMapControlSlot
        flashKey="center"
        activeFlashKey={mapControlFlash}
        onFlash={onFlash}
        variant="secondary"
        label="Center view"
        icon={<Crosshair />}
        onClick={onCenterView}
      />
      <GraphMapControlSlot
        flashKey="fit"
        activeFlashKey={mapControlFlash}
        onFlash={onFlash}
        variant="secondary"
        label="Fit to screen"
        icon={<Maximize2 />}
        onClick={onFitToScreen}
      />
    </div>
  );
}
