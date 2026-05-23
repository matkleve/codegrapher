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

export function getFileIcon(fileName: string): FileIconInfo {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".spec.ts") || lower.endsWith(".spec.tsx")) {
    return { codicon: "codicon-beaker", colorClass: "text-amber-400" };
  }
  if (lower.endsWith(".test.ts") || lower.endsWith(".test.tsx")) {
    return { codicon: "codicon-beaker", colorClass: "text-amber-400" };
  }
  if (lower.endsWith(".tsx")) {
    return { codicon: "codicon-file-code", colorClass: "text-cyan-400" };
  }
  if (lower.endsWith(".ts")) {
    return { codicon: "codicon-file-code", colorClass: "text-blue-400" };
  }

  return { codicon: "codicon-file", colorClass: "text-muted-foreground" };
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
