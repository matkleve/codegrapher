import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { cn } from "@/lib/utils";

type NodeCardHeaderProps = {
  title: string;
  chip?: ReactNode;
  bodyExpanded: boolean;
  onToggleCollapsed: () => void;
};

export function NodeCardHeader({
  title,
  chip,
  bodyExpanded,
  onToggleCollapsed,
}: NodeCardHeaderProps) {
  return (
    <div
      className={cn(
        "hoverable flex w-full flex-col items-start gap-2 rounded-t-lg border border-transparent border-b border-border bg-accent px-3 py-2 text-left",
      )}
    >
      {chip}
      <div className="flex w-full min-w-0 items-center gap-2">
        <button
          type="button"
          className="nodrag flex shrink-0 cursor-pointer items-center justify-center rounded-sm p-0.5 text-accent-foreground hover:bg-accent-foreground/10"
          title={bodyExpanded ? "Collapse" : "Expand"}
          aria-label={bodyExpanded ? "Collapse" : "Expand"}
          aria-expanded={bodyExpanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapsed();
          }}
        >
          <ExpandChevron expanded={bodyExpanded} />
        </button>
        <p className="min-w-0 flex-1 truncate text-left text-sm font-bold text-accent-foreground">
          {title}
        </p>
        <div
          className={cn(
            NODE_DRAG_HANDLE,
            "flex shrink-0 cursor-grab touch-none items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:bg-accent-foreground/10 active:cursor-grabbing",
          )}
          title="Drag to move"
          aria-label="Drag to move"
        >
          <GripVertical className="size-4" />
        </div>
      </div>
    </div>
  );
}
