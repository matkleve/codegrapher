import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Elevated boxes above the canvas — menus, map legend panels, peek labels.
 *
 * - `menu` — portaled connection menus / load pickers (card + blur).
 * - `chrome` — graph map popovers and hover peek labels (popover surface).
 */
export const FLOATING_PANEL_SURFACES = {
  menu: "pointer-events-auto overflow-hidden rounded-xl border border-border bg-card/98 shadow-lg backdrop-blur-sm",
  chrome: "rounded-md border border-border bg-popover shadow-md",
} as const;

export type FloatingPanelVariant = keyof typeof FLOATING_PANEL_SURFACES;

/** @deprecated Use `FLOATING_PANEL_SURFACES.menu`. */
export const FLOATING_PANEL_SURFACE = FLOATING_PANEL_SURFACES.menu;

export function floatingPanelClass(
  ...args: (FloatingPanelVariant | string | undefined)[]
): string {
  const [first, ...rest] = args;
  if (first === "menu" || first === "chrome") {
    return cn(FLOATING_PANEL_SURFACES[first], ...rest);
  }
  return cn(FLOATING_PANEL_SURFACES.menu, first, ...rest);
}

type FloatingPanelProps = ComponentPropsWithoutRef<"div"> & {
  as?: "div" | "span";
  variant?: FloatingPanelVariant;
};

export const FloatingPanel = forwardRef<HTMLDivElement, FloatingPanelProps>(
  function FloatingPanel(
    { as: Tag = "div", variant = "menu", className, ...props },
    ref,
  ) {
    return (
      <Tag
        ref={Tag === "div" ? ref : undefined}
        className={floatingPanelClass(variant, className)}
        {...props}
      />
    );
  },
);
