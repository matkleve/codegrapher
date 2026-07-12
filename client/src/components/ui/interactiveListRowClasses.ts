import {
  INTERACTIVE_ROW_DOUBLE,
  INTERACTIVE_ROW_LEFT,
  INTERACTIVE_ROW_LEGEND_LEFT,
  INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT,
} from "@/lib/controlTokens";
import { cn } from "@/lib/utils";
import type { ListRowVariant } from "@/components/ui/InteractiveListRow";

export function compactRowClass(
  density: "comfortable" | "compact" | "plain" | "legend" | undefined,
  fullWidth: boolean,
): string {
  if (density === "comfortable") return INTERACTIVE_ROW_DOUBLE;
  if (density === "legend") {
    return fullWidth
      ? INTERACTIVE_ROW_LEGEND_LEFT
      : INTERACTIVE_ROW_LEGEND_LEFT.replace("w-full", "w-auto");
  }
  const base = cn(INTERACTIVE_ROW_LEFT, "control-row-compact");
  return fullWidth ? base : base.replace("w-full", "w-auto");
}

export function variantClass(
  variant: ListRowVariant,
  inGraph: boolean,
): string | undefined {
  switch (variant) {
    case "explorerSection":
      return cn("list-row-explorer", "list-row-explorer--section");
    case "explorerFolder":
      return cn("list-row-explorer", "list-row-explorer--folder");
    case "explorerFile":
      return cn(
        "list-row-explorer",
        "list-row-explorer--file",
        inGraph && "list-row-explorer--in-graph",
      );
    case "graphChrome":
      return "list-row-graph-chrome";
    default:
      return undefined;
  }
}
