import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Points down when collapsed, up when expanded (180°). */
export function ExpandChevron({
  expanded,
  className,
}: {
  expanded: boolean;
  className?: string;
}) {
  return (
    <ChevronDown
      className={cn(
        "size-3.5 shrink-0 transition-transform duration-200",
        expanded ? "rotate-180" : "rotate-0",
        className,
      )}
      aria-hidden
    />
  );
}
