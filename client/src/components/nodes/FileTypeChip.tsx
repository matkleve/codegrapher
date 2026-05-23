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
        "inline-flex h-5 max-w-full items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-xs leading-none",
        className,
      )}
    >
      <i
        className={cn(
          "codicon flex size-3 shrink-0 items-center justify-center leading-none",
          iconClass,
          chip.colorClass,
        )}
        style={{ fontSize: 12 }}
        aria-hidden
      />
      <span className="truncate font-mono text-xs leading-none text-foreground">{extension}</span>
    </span>
  );
}
