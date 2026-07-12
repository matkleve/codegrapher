import { forwardRef, type ReactNode } from "react";
import type { ComponentProps } from "react";
import { GraphMapControlButton } from "@/components/graph/GraphMapControlButton";
import { FloatingPanel } from "@/components/ui/floatingPanel";
import { cn } from "@/lib/utils";

type GraphMapControlButtonProps = ComponentProps<typeof GraphMapControlButton>;

export type GraphMapControlSlotProps = Omit<GraphMapControlButtonProps, "children"> & {
  label: string;
  icon: ReactNode;
  /** `passive` — muted ink when shown on hover (e.g. disabled reading focus). */
  labelTone?: "default" | "passive";
  /** `hidden` while a floating panel is open (legend). Default: show on hover/focus only. */
  labelVisibility?: "hover" | "hidden";
  children?: ReactNode;
  slotClassName?: string;
};

export const GraphMapControlSlot = forwardRef<HTMLDivElement, GraphMapControlSlotProps>(
  function GraphMapControlSlot(
    {
      label,
      icon,
      labelTone = "default",
      labelVisibility = "hover",
      children,
      slotClassName,
      title,
      "aria-label": ariaLabelProp,
      className,
      disabled,
      ...buttonProps
    },
    ref,
  ) {
    const ariaLabel = ariaLabelProp ?? title ?? label;
    const showLabel = labelVisibility !== "hidden";

    return (
      <div ref={ref} className={cn("graph-map-control-slot", slotClassName)}>
        <GraphMapControlButton
          title={title ?? label}
          aria-label={ariaLabel}
          disabled={disabled}
          className={className}
          {...buttonProps}
        >
          {icon}
        </GraphMapControlButton>
        {showLabel ? (
          <FloatingPanel
            as="span"
            variant="chrome"
            className={cn(
              "graph-map-control-label",
              "px-2 py-1 text-xs font-medium leading-[var(--control-row-line-height)] text-foreground",
              labelTone === "passive" && "font-normal text-muted-foreground",
            )}
          >
            {label}
          </FloatingPanel>
        ) : null}
        {children}
      </div>
    );
  },
);
