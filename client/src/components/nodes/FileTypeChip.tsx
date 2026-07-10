import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { getFileTypeChipStyle } from "@/lib/fileTypeChip";
import { cn } from "@/lib/utils";

type FileTypeChipProps = {
  filePath: string;
  className?: string;
};

export function FileTypeChip({ filePath, className }: FileTypeChipProps) {
  const chip = getFileTypeChipStyle(filePath);

  return (
    <span
      className={cn(
        "file-type-chip inline-flex w-fit max-w-full shrink-0 self-start items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs leading-none",
        chip.pillClass,
        className,
      )}
    >
      <VscodeFileIcon icon={chip.vscodeIcon} size={14} className="size-3.5" />
      <span className="whitespace-nowrap font-mono leading-none">{chip.extension}</span>
    </span>
  );
}
