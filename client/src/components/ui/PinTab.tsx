import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PinTabProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

/** Compact tab for multi-pin trace strip in TokenContextBar. */
export function PinTab({ label, active, onClick }: PinTabProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className={cn(
        "font-mono text-2xs font-medium",
        active
          ? "border border-brand-border bg-brand-surface text-foreground hover:bg-brand-surface"
          : "text-muted-foreground",
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
