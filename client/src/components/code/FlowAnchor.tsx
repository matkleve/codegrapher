import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type FlowAnchorSide = "left" | "right";

type FlowAnchorSize = "chip" | "card" | "node";

/** Round dot, mirrors the prototype's `.tok::before/::after` (6px circle, 3px gap). */
const DOT: Record<FlowAnchorSize, { diameter: number; offset: number }> = {
  chip: { diameter: 6, offset: 9 },
  card: { diameter: 7, offset: 10 },
  node: { diameter: 6, offset: 9 },
};

type FlowAnchorProps = {
  side: FlowAnchorSide;
  targetId?: string;
  colorClass?: string;
  visible?: boolean;
  highlighted?: boolean;
  size?: FlowAnchorSize;
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
    const { diameter, offset } = DOT[size];
    const show = visible && highlighted;

    return (
      <span
        ref={ref}
        aria-hidden
        data-flow-anchor={side}
        {...(targetId ? { "data-flow-anchor-target": targetId } : {})}
        style={{
          width: diameter,
          height: diameter,
          ...(side === "left" ? { left: -offset } : { right: -offset }),
        }}
        className={cn(
          "flow-anchor pointer-events-none absolute top-1/2 block shrink-0 rounded-full",
          show ? "flow-anchor-on" : "flow-anchor-off",
          colorClass,
          className,
        )}
      />
    );
  },
);
