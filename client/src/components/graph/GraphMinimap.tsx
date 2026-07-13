import { MiniMap, PanelPosition, useNodes, type Node } from "@xyflow/react";

function minimapNodeColor(node: Node): string {
  return node.type === "file" ? "var(--muted-foreground)" : "var(--chart-2)";
}

export function GraphMinimap() {
  const nodes = useNodes();
  if (nodes.length === 0) return null;

  return (
    <MiniMap
      className="graph-minimap"
      position={PanelPosition.BottomLeft}
      ariaLabel="Graph minimap"
      pannable
      zoomable
      nodeColor={minimapNodeColor}
      nodeStrokeColor="var(--border)"
      nodeStrokeWidth={1}
      nodeBorderRadius={4}
      maskColor="color-mix(in oklch, var(--background) 55%, transparent)"
      maskStrokeColor="var(--ring)"
      maskStrokeWidth={1.5}
      bgColor="var(--card)"
    />
  );
}
