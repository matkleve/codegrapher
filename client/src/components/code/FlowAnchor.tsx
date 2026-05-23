import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type FlowAnchorSide = "left" | "right";

type FlowAnchorProps = {
  side: FlowAnchorSide;
  /** Matches React Flow handle id for preview target resolution. */
  targetId?: string;
  colorClass?: string;
  visible?: boolean;
  highlighted?: boolean;
  size?: "chip" | "node";
  className?: string;
};

export const FlowAnchor = forwardRef<HTMLSpanElement, FlowAnchorProps>(
  function FlowAnchor(
    {
      side,
      targetId,
      colorClass = "bg-border",
      visible = true,
      highlighted = false,
      size = "chip",
      className,
    },
    ref,
  ) {
    const h = size === "chip" ? "h-3" : "h-5";
    const position =
      side === "left"
        ? "absolute left-[-6px] top-1/2 -translate-y-1/2"
        : "absolute right-[-6px] top-1/2 -translate-y-1/2";
    const shape = side === "left" ? "rounded-r-full" : "rounded-l-full";

    return (
      <span
        ref={ref}
        aria-hidden
        data-flow-anchor={side}
        {...(targetId ? { "data-flow-anchor-target": targetId } : {})}
        className={cn(
          "pointer-events-none block w-1.5 shrink-0 transition-opacity duration-100",
          h,
          shape,
          position,
          colorClass,
          visible ? (highlighted ? "opacity-100" : "opacity-30") : "opacity-0",
          className,
        )}
      />
    );
  },
);
