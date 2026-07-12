/** Shared SVG arrow markers for preview + structural wires and the legend. */
export function WireMarkerDefs() {
  return (
    <>
      <marker
        id="wire-arrow-open"
        markerWidth="6"
        markerHeight="6"
        refX="6"
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
        id="wire-arrow-bar"
        markerWidth="6"
        markerHeight="8"
        refX="3"
        refY="1"
        orient="auto"
      >
        <path
          d="M0,1 L6,1 M3,1 L3,7"
          fill="none"
          stroke="context-stroke"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </marker>
      <marker
        id="wire-bracket-start"
        markerWidth="5"
        markerHeight="10"
        refX="1"
        refY="5"
        orient="auto-start-reverse"
      >
        <path
          d="M4,0 L4,10"
          fill="none"
          stroke="context-stroke"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </marker>
      <marker
        id="wire-bracket-end"
        markerWidth="5"
        markerHeight="10"
        refX="1"
        refY="5"
        orient="auto"
      >
        <path
          d="M1,0 L1,10"
          fill="none"
          stroke="context-stroke"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </marker>
      <marker
        id="wire-arrow-branch-filled"
        markerWidth="7"
        markerHeight="7"
        refX="7"
        refY="3.5"
        orient="auto"
      >
        <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
      </marker>
      <marker
        id="structural-arrow-triangle"
        markerWidth="8"
        markerHeight="8"
        refX="8"
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
        refX="8"
        refY="4"
        orient="auto"
      >
        <path d="M0,4 L4,0 L8,4 L4,8 Z" fill="context-stroke" />
      </marker>
    </>
  );
}
