import type { ReactNode } from "react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { INTERACTIVE_ROW_NODRAG } from "@/lib/controlTokens";

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
          className={`${INTERACTIVE_ROW_NODRAG} min-w-0 flex-1`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ExpandChevron expanded={expanded} className="text-muted-foreground" />
          <span className="member-section-label text-xs font-medium text-muted-foreground">{label}</span>
        </button>
        <button
          type="button"
          className={`member-section-bulk ${INTERACTIVE_ROW_NODRAG} shrink-0 text-muted-foreground`}
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
