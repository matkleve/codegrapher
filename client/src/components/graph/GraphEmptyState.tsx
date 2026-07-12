import { Waypoints } from "lucide-react";

type GraphEmptyStateProps = {
  title: string;
  hint: string;
};

export function GraphEmptyState({ title, hint }: GraphEmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-border bg-card/70 text-muted-foreground shadow-[var(--node-shadow)] backdrop-blur-sm">
        <Waypoints className="size-6" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
