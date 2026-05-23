import { ChevronDown, ChevronRight, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GRAPH_NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { cn } from "@/lib/utils";

type NodeCardHeaderProps = {
  fileName: string;
  subtitle?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function NodeCardHeader({
  fileName,
  subtitle,
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
      <div className="flex items-center gap-2 px-2 pb-2">
        <div className="nodrag min-w-0 flex-1 px-1">
          <p className="truncate font-mono text-sm font-semibold text-accent-foreground">
            {fileName}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="nodrag shrink-0 text-accent-foreground hover:bg-accent-foreground/10"
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
  );
}
