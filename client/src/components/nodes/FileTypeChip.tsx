import { Codicon, getFileTypeChip } from "@/lib/fileIcons";
import { cn } from "@/lib/utils";

type FileTypeChipProps = {
  filePath: string;
  className?: string;
};

export function FileTypeChip({ filePath, className }: FileTypeChipProps) {
  const chip = getFileTypeChip(filePath);
  if (!chip.extension) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground",
        className,
      )}
    >
      <Codicon name={chip.codicon} className={cn("size-3 shrink-0", chip.colorClass)} />
      <span>{chip.extension}</span>
    </span>
  );
}
