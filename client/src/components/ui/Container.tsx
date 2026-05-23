import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContainerProps = {
  children: ReactNode;
  title?: string;
  maxHeight?: string;
  className?: string;
};

export function Container({ children, title, maxHeight, className }: ContainerProps) {
  return (
    <div
      className={cn(
        "overflow-y-auto rounded-lg border border-border bg-card p-3 scrollbar-thin",
        maxHeight,
        className,
      )}
    >
      {title ? (
        <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      ) : null}
      {children}
    </div>
  );
}
