import { ConnectionTargetLeading } from "@/components/ui/ConnectionTargetLeading";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { fileBaseName, type LoadTargetItem } from "@/lib/loadTargets";
import type { SemanticTokenKind } from "@/lib/tokenColors";

type LoadTargetRowProps = {
  item: LoadTargetItem;
  token: string;
  kind: SemanticTokenKind;
  onSelect: () => void;
};

export function LoadTargetRow({
  item,
  token,
  kind,
  onSelect,
}: LoadTargetRowProps) {
  const title =
    item.label !== token ? item.label : fileBaseName(item.filePath);

  const subtitleParts = [
    item.subtitle,
    `line ${item.line}`,
    item.label !== token && item.label !== fileBaseName(item.filePath)
      ? fileBaseName(item.filePath)
      : null,
  ].filter(Boolean);

  return (
    <InteractiveListRow
      title={title}
      subtitle={subtitleParts.join(" · ")}
      leading={<ConnectionTargetLeading kind={kind} />}
      onClick={onSelect}
    />
  );
}
