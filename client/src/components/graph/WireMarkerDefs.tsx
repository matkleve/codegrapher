/** Shared SVG arrow markers for preview + structural wires and the legend. */
export function WireMarkerDefs() {
  return (
    <>
      <marker
        id="wire-arrow-open"
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
      <marker
        id="structural-arrow-triangle"
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
      <marker
        id="structural-arrow-diamond"
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
      >
        <path d="M0,4 L4,0 L8,4 L4,8 Z" fill="context-stroke" />
      </marker>
    </>
  );
}
