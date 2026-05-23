import { cn } from "@/lib/utils";

export interface FileIconInfo {
  codicon: string;
  colorClass: string;
}

export function getFolderIcon(open: boolean): FileIconInfo {
  return {
    codicon: open ? "codicon-folder-opened" : "codicon-folder",
    colorClass: "text-primary",
  };
}

const EXTENSION_SUFFIXES = [
  ".component.tsx",
  ".component.ts",
  ".service.ts",
  ".module.ts",
  ".resolver.ts",
  ".guard.ts",
  ".pipe.ts",
  ".directive.ts",
  ".spec.tsx",
  ".spec.ts",
  ".test.tsx",
  ".test.ts",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
] as const;

export function getFileExtensionLabel(filePath: string): string {
  const lower = filePath.toLowerCase();
  for (const ext of EXTENSION_SUFFIXES) {
    if (lower.endsWith(ext)) return ext;
  }
  const dot = filePath.lastIndexOf(".");
  return dot >= 0 ? filePath.slice(dot) : "";
}

export interface FileTypeChipInfo {
  codicon: string;
  colorClass: string;
  extension: string;
}

export function getFileTypeChip(filePath: string): FileTypeChipInfo {
  const lower = filePath.toLowerCase();
  const extension = getFileExtensionLabel(filePath);

  if (lower.endsWith(".component.ts") || lower.endsWith(".component.tsx")) {
    return { codicon: "codicon-symbol-class", colorClass: "text-violet-400", extension };
  }
  if (lower.endsWith(".service.ts")) {
    return { codicon: "codicon-gear", colorClass: "text-amber-400", extension };
  }
  if (lower.endsWith(".module.ts")) {
    return { codicon: "codicon-symbol-module", colorClass: "text-purple-400", extension };
  }
  if (lower.endsWith(".spec.ts") || lower.endsWith(".spec.tsx")) {
    return { codicon: "codicon-beaker", colorClass: "text-amber-400", extension };
  }
  if (lower.endsWith(".test.ts") || lower.endsWith(".test.tsx")) {
    return { codicon: "codicon-beaker", colorClass: "text-amber-400", extension };
  }
  if (lower.endsWith(".tsx")) {
    return { codicon: "codicon-file-code", colorClass: "text-cyan-400", extension };
  }
  if (lower.endsWith(".ts")) {
    return { codicon: "codicon-file-code", colorClass: "text-blue-400", extension };
  }

  return { codicon: "codicon-file", colorClass: "text-muted-foreground", extension };
}

export function getFileIcon(fileName: string): FileIconInfo {
  const chip = getFileTypeChip(fileName);
  return { codicon: chip.codicon, colorClass: chip.colorClass };
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
