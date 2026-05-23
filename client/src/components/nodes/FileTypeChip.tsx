import { getFileTypeChip } from "@/lib/fileIcons";
import { cn } from "@/lib/utils";

type FileTypeChipProps = {
  filePath: string;
  className?: string;
};

export function FileTypeChip({ filePath, className }: FileTypeChipProps) {
  const chip = getFileTypeChip(filePath);
  const extension = chip.extension || ".file";
  const iconClass = chip.codicon.startsWith("codicon-")
    ? chip.codicon
    : `codicon-${chip.codicon}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs",
        className,
      )}
    >
      <i
        className={cn("codicon shrink-0 text-[13px] leading-none", iconClass, chip.colorClass)}
        aria-hidden
      />
      <span className="font-mono text-muted-foreground">{extension}</span>
    </span>
  );
}
