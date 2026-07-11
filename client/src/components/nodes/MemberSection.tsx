import type { ReactNode } from "react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";

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
        <InteractiveListRow
          density="compact"
          title={label}
          contentTone="muted"
          className="member-section-toggle member-section-label nodrag min-w-0 flex-1"
          leading={<ExpandChevron expanded={expanded} className="text-muted-foreground" />}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        />
        <InteractiveListRow
          density="compact"
          title={bulkActionLabel}
          contentTone="muted"
          className="member-section-bulk nodrag shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onBulkAction();
          }}
        />
      </div>
      {expanded ? <div className="flex flex-col gap-2">{children}</div> : null}
    </section>
  );
}
