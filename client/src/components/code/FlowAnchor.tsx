import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type FlowAnchorSide = "left" | "right";

type FlowAnchorSize = "chip" | "card" | "node";

/** Semicircle: width = radius, height = diameter (2× radius). */
const SEMICIRCLE: Record<FlowAnchorSize, { width: number; height: number }> = {
  chip: { width: 5, height: 10 },
  card: { width: 6, height: 12 },
  node: { width: 5, height: 10 },
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

function semicircleRadius(side: FlowAnchorSide, width: number): string {
  const r = `${width}px`;
  return side === "left" ? `${r} 0 0 ${r}` : `0 ${r} ${r} 0`;
}

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
    const { width, height } = SEMICIRCLE[size];

    const show =
      visible &&
      (size === "chip" ? highlighted : highlighted || size === "node");

    return (
      <span
        ref={ref}
        aria-hidden
        data-flow-anchor={side}
        {...(targetId ? { "data-flow-anchor-target": targetId } : {})}
        style={{
          width,
          height,
          borderRadius: semicircleRadius(side, width),
          ...(side === "left" ? { left: -width } : { right: -width }),
        }}
        className={cn(
          "flow-anchor pointer-events-none absolute top-1/2 block shrink-0 -translate-y-1/2",
          show ? "flow-anchor-on" : "flow-anchor-off",
          colorClass,
          className,
        )}
      />
    );
  },
);
