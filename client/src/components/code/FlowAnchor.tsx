import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFlowAnchorRegistration } from "@/hooks/useElementRegistry";

export type FlowAnchorSide = "left" | "right";

type FlowAnchorSize = "chip" | "card" | "node";

/** Round dot beside tokens — anchored outside the host's padding box so the
    ring/glow never intrudes on chip text. */
const DOT: Record<FlowAnchorSize, { diameter: number; gap: number }> = {
  chip: { diameter: 4, gap: 4 },
  card: { diameter: 5, gap: 8 },
  node: { diameter: 4, gap: 7 },
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
    const { diameter, gap } = DOT[size];
    const show = visible && highlighted;
    const innerRef = useRef<HTMLSpanElement>(null);
    const setRef = (el: HTMLSpanElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };
    useFlowAnchorRegistration(innerRef);

    return (
      <span
        ref={setRef}
        aria-hidden
        data-flow-anchor={side}
        {...(targetId ? { "data-flow-anchor-target": targetId } : {})}
        style={{
          width: diameter,
          height: diameter,
          top: "50%",
          ...(side === "left"
            ? { right: `calc(100% + ${gap}px)` }
            : { left: `calc(100% + ${gap}px)` }),
        }}
        className={cn(
          "flow-anchor pointer-events-none absolute block shrink-0 rounded-full",
          show ? "flow-anchor-on" : "flow-anchor-off",
          colorClass,
          className,
        )}
      />
    );
  },
);
