import { memo } from "react";
import { GripHorizontal } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GRAPH_NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { cn } from "@/lib/utils";
import type { FileNodeData } from "@/components/nodes/flowNodeData";

function FileNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FileNodeData;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={cn(
          GRAPH_NODE_DRAG_HANDLE,
          "flex cursor-grab touch-none items-center justify-center rounded px-3 py-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing",
        )}
        title="Drag to move"
        aria-label="Drag to move"
      >
        <GripHorizontal className="size-3.5" />
      </div>
      <div
        className={cn(
          "nodrag inline-flex min-w-[120px] max-w-[220px] items-center justify-center rounded-full border border-primary/30 bg-primary px-3 py-1.5 text-primary-foreground shadow-sm",
          (selected || nodeData.selected) && "ring-2 ring-ring",
          nodeData.pathHighlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
        title={nodeData.filePath}
      >
        <Handle type="target" position={Position.Top} className="!bg-primary-foreground" />
        <span className="truncate text-xs font-medium">{nodeData.label}</span>
        <Handle type="source" position={Position.Bottom} className="!bg-primary-foreground" />
      </div>
    </div>
  );
}

export const FileNode = memo(FileNodeComponent);
