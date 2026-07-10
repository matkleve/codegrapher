import type { ReactNode } from "react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";

type MemberSectionProps = {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  bulkActionLabel: string;
  onBulkAction: () => void;
  children: ReactNode;
};

/** A collapsible "Properties" / "Methods" group with a bulk open/close action. */
export function MemberSection({
  label,
  expanded,
  onToggle,
  bulkActionLabel,
  onBulkAction,
  children,
}: MemberSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hoverable control-row-compact nodrag flex min-w-0 flex-1 cursor-pointer items-center border border-transparent text-left"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ExpandChevron expanded={expanded} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </button>
        <button
          type="button"
          className="hoverable control-row-compact nodrag shrink-0 cursor-pointer border border-transparent text-muted-foreground"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onBulkAction();
          }}
        >
          {bulkActionLabel}
        </button>
      </div>
      {expanded ? <div className="flex flex-col gap-2">{children}</div> : null}
    </section>
  );
}
