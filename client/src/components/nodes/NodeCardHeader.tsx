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
    <div className="rounded-t-lg border-b border-border bg-accent p-2">
      <div
        className={cn(
          NODE_DRAG_HANDLE,
          "hoverable flex w-full cursor-grab gap-2 rounded-md border border-transparent px-2 py-2 text-left active:cursor-grabbing",
        )}
        title="Drag to move"
      >
        <GripVertical
          className="pointer-events-none size-4 shrink-0 self-center text-muted-foreground"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {chip}
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="nodrag flex shrink-0 cursor-pointer items-center justify-center rounded-sm p-0.5 text-foreground hover:bg-primary/10"
              title={bodyExpanded ? "Collapse" : "Expand"}
              aria-label={bodyExpanded ? "Collapse" : "Expand"}
              aria-expanded={bodyExpanded}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapsed();
              }}
            >
              <ExpandChevron expanded={bodyExpanded} />
            </button>
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
