import { Pause, Play, Square } from "lucide-react";
import type { GutterAction } from "@/lib/simGutterActions";
import { GUTTER_ACTION_LABELS } from "@/lib/simGutterActions";
import { cn } from "@/lib/utils";

const ICON_SIZE = 10;

export function GutterActionIcon({
  action,
  className,
}: {
  action: GutterAction | "current";
  className?: string;
}) {
  const props = { size: ICON_SIZE, strokeWidth: 2.25, className };
  if (action === "current") return <span className={cn("text-2xs font-bold", className)}>→</span>;
  if (action === "start") return <Play {...props} />;
  if (action === "end") return <Square {...props} />;
  return <Pause {...props} />;
}

export function SimGutterMenu({
  actions,
  onPick,
}: {
  actions: GutterAction[];
  onPick: (action: GutterAction) => void;
}) {
  return (
    <div className="sim-gutter-menu nodrag" role="menu">
      {actions.map((action, index) => (
        <button
          key={action}
          type="button"
          role="menuitem"
          className={cn("sim-gutter-menu__item", index === 0 && "sim-gutter-menu__item--primary")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPick(action);
          }}
        >
          <GutterActionIcon action={action} />
          <span>{GUTTER_ACTION_LABELS[action]}</span>
        </button>
      ))}
    </div>
  );
}
