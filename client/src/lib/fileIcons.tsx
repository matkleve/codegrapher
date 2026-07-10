import { getFileTypeChipStyle } from "@/lib/fileTypeChip";
import { cn } from "@/lib/utils";

export interface FileIconInfo {
  codicon?: string;
  vscodeIcon?: string;
  colorClass: string;
}

export function getFolderIcon(open: boolean): FileIconInfo {
  return {
    codicon: open ? "codicon-folder-opened" : "codicon-folder",
    colorClass: "text-muted-foreground",
  };
}

export { getFileExtensionLabel } from "@/lib/fileTypeChip";

export function getFileIcon(fileName: string): FileIconInfo {
  const { vscodeIcon } = getFileTypeChipStyle(fileName);
  return { vscodeIcon, colorClass: "" };
}

export function Codicon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return <i className={cn("codicon", name, className)} aria-hidden />;
}
