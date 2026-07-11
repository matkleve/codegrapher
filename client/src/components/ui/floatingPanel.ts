import { cn } from "@/lib/utils";

/** Shared chrome for portaled menus, pickers, and overlays. */
export const FLOATING_PANEL_SURFACE =
  "pointer-events-auto overflow-hidden rounded-xl border border-border bg-card/98 shadow-lg backdrop-blur-sm";

export function floatingPanelClass(...extra: (string | undefined)[]): string {
  return cn(FLOATING_PANEL_SURFACE, ...extra);
}
