import type { ReactNode } from "react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { NODE_DRAG_HANDLE } from "@/components/nodes/graphNodeUi";
import { cn } from "@/lib/utils";

type NodeCardHeaderProps = {
  title: string;
  chip?: ReactNode;
  /** Body visible = expanded chevron points up */
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
        NODE_DRAG_HANDLE,
        "flex w-full cursor-grab flex-col items-start gap-2 border-b border-border bg-accent px-3 py-2 text-left active:cursor-grabbing",
      )}
      title="Drag to move"
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
      </div>
    </div>
  );
}
