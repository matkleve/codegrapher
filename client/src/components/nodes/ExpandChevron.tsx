import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Points down when collapsed, up when expanded (180°). */
export function ExpandChevron({
  expanded,
  className,
  groupHoverFlip,
}: {
  expanded: boolean;
  className?: string;
  /** e.g. "member" — preview toggle direction when the named group is hovered */
  groupHoverFlip?: string;
}) {
  const hoverFlipClass = groupHoverFlip
    ? expanded
      ? `group-hover/${groupHoverFlip}:!rotate-0`
      : `group-hover/${groupHoverFlip}:!rotate-180`
    : undefined;

  return (
    <ChevronDown
      className={cn(
        "size-3.5 shrink-0 transition-[transform,color,stroke] duration-[380ms] ease-[var(--ease)]",
        expanded ? "rotate-180" : "rotate-0",
        hoverFlipClass,
        className,
      )}
      aria-hidden
    />
  );
}
