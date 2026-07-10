import { useCtrlKey } from "@/context/CtrlKeyContext";
import { INTERACTIVE_TOGGLE_ACTIVE } from "@/lib/controlTokens";
import { cn } from "@/lib/utils";

/** Mirrors connectors-proto.html `⌃ Ctrl` toggle — pins Ctrl-preview mode without the key. */
export function CtrlToggle() {
  const { isCtrlActive, toggleCtrlForced } = useCtrlKey();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[var(--control-height-compact)] cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium transition-colors",
        isCtrlActive
          ? INTERACTIVE_TOGGLE_ACTIVE
          : "border-border bg-card text-foreground hover:border-brand hover:text-brand",
      )}
      aria-pressed={isCtrlActive}
      title="Toggle Ctrl mode"
      onClick={toggleCtrlForced}
    >
      ⌃ Ctrl
    </button>
  );
}
