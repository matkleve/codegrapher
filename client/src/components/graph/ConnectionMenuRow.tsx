import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { ConnectionTargetLeading } from "@/components/ui/ConnectionTargetLeading";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import type { ConnectionMenuRow as ConnectionMenuRowData } from "@/lib/connectionMenu";

const ACTION_LABEL: Record<ConnectionMenuRowData["action"], string> = {
  jump: "Jump",
  load: "Load",
  openEditor: "Open",
};

type ConnectionMenuRowProps = {
  row: ConnectionMenuRowData;
  onSelect: () => void;
};

export function ConnectionMenuRow({ row, onSelect }: ConnectionMenuRowProps) {
  return (
    <InteractiveListRow
      title={row.primaryLabel}
      subtitle={row.secondaryLabel}
      actionLabel={ACTION_LABEL[row.action]}
      leading={<ConnectionTargetLeading kind={row.kind} />}
      onClick={onSelect}
    />
  );
}
