import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { openFileInEditor } from "@/api";
import { getFileTypeChipStyle } from "@/lib/fileTypeChip";
import { fileDisplayName } from "@/lib/recentFiles";
import { cn } from "@/lib/utils";

type FileTypeChipProps = {
  filePath: string;
  className?: string;
};

export function FileTypeChip({ filePath, className }: FileTypeChipProps) {
  const chip = getFileTypeChipStyle(filePath);

  return (
    <button
      type="button"
      title={`Open ${filePath} in editor`}
      className={cn(
        "file-type-chip nodrag inline-flex w-fit max-w-full shrink-0 cursor-pointer self-start items-center gap-1.5 rounded-full border px-2 py-0.5 text-left text-xs leading-none",
        chip.pillClass,
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void openFileInEditor(filePath, 1);
      }}
    >
      <VscodeFileIcon icon={chip.vscodeIcon} size={14} className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate font-mono leading-none">
        {fileDisplayName(filePath)}
      </span>
    </button>
  );
}
