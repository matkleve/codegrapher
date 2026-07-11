import { cn } from "@/lib/utils";

type GroupHoverFlip = "member" | "caret";

const GROUP_HOVER_HIDE: Record<GroupHoverFlip, string> = {
  member: "group-hover/member:opacity-0",
  caret: "group-hover/caret:opacity-0",
};

const GROUP_HOVER_SHOW: Record<GroupHoverFlip, string> = {
  member: "group-hover/member:opacity-100",
  caret: "group-hover/caret:opacity-100",
};

/** Prototype caret: ▸ collapsed, ▾ expanded; optional hover preview flip. */
export function ExpandChevron({
  expanded,
  className,
  groupHoverFlip,
  headerHoverPreview,
}: {
  expanded: boolean;
  className?: string;
  /** Preview toggle direction when the named Tailwind group is hovered */
  groupHoverFlip?: GroupHoverFlip;
  /** Preview on `.member-row-header` hover (skips hover while over `.member-row-label`) */
  headerHoverPreview?: boolean;
}) {
  const rest = expanded ? "▾" : "▸";
  const hover = expanded ? "▸" : "▾";
  const groupFlip = groupHoverFlip ? GROUP_HOVER_HIDE[groupHoverFlip] : null;
  const groupShow = groupHoverFlip ? GROUP_HOVER_SHOW[groupHoverFlip] : null;

  return (
    <span
      className={cn(
        "expand-chevron relative inline-flex h-[1em] w-[0.65rem] shrink-0 self-center items-center justify-center text-2xs leading-none",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "flex h-full w-full items-center justify-center",
          headerHoverPreview
            ? "expand-chevron-icon"
            : "transition-opacity duration-[var(--motion-hover-color)] ease-[var(--ease)]",
          groupFlip,
        )}
      >
        {rest}
      </span>
      {groupHoverFlip ? (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-[var(--motion-hover-color)] ease-[var(--ease)]",
            groupShow,
          )}
        >
          {hover}
        </span>
      ) : null}
    </span>
  );
}
