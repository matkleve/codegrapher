import { usePreviewEdgeOverlay } from "@/components/graph/usePreviewEdgeOverlay";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";

export function PreviewEdgeOverlay() {
  const svgRef = usePreviewEdgeOverlay();

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-[48] overflow-visible"
      aria-hidden
    >
      <defs>
        <WireMarkerDefs />
      </defs>
    </svg>
  );
}
