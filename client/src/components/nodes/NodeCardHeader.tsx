import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GRAPH_NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { cn } from "@/lib/utils";

type NodeCardHeaderProps = {
  title: string;
  fileName?: string;
  chip?: ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function NodeCardHeader({
  title,
  fileName,
  chip,
  collapsed,
  onToggleCollapsed,
}: NodeCardHeaderProps) {
  return (
    <div className="border-b border-border bg-accent">
      <div className="flex justify-center py-1">
        <div
          className={cn(
            GRAPH_NODE_DRAG_HANDLE,
            "flex cursor-grab touch-none items-center justify-center rounded px-4 py-0.5 text-muted-foreground hover:bg-accent-foreground/10 active:cursor-grabbing",
          )}
          title="Drag to move"
          aria-label="Drag to move"
        >
          <GripHorizontal className="size-4" />
        </div>
      </div>
      <div className="nodrag flex flex-col gap-1.5 px-2 pb-2">
        {chip ? <div className="flex justify-start">{chip}</div> : null}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-accent-foreground">{title}</p>
            {fileName ? (
              <p className="truncate font-mono text-xs text-muted-foreground">{fileName}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-accent-foreground hover:bg-accent-foreground/10"
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand" : "Collapse"}
            aria-expanded={!collapsed}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapsed();
            }}
          >
            {collapsed ? <ChevronRight /> : <ChevronDown />}
          </Button>
        </div>
      </div>
    </div>
  );
}
