import { cn } from "@/lib/utils";

/** Prototype caret: ▸ collapsed, ▾ expanded; optional group-hover preview flip. */
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
  const rest = expanded ? "▾" : "▸";
  const hover = expanded ? "▸" : "▾";
  const flip = groupHoverFlip ? `group-hover/${groupHoverFlip}:` : null;

  return (
    <span
      className={cn(
        "expand-chevron relative inline-flex h-[1em] w-[0.65rem] shrink-0 self-center items-center justify-center text-[10px] leading-none",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "flex h-full w-full items-center justify-center transition-opacity duration-[380ms] ease-[var(--ease)]",
          flip && `${flip}opacity-0`,
        )}
      >
        {rest}
      </span>
      {flip ? (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-[380ms] ease-[var(--ease)]",
            `${flip}opacity-100`,
          )}
        >
          {hover}
        </span>
      ) : null}
    </span>
  );
}
