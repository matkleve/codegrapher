import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";

export function SimulationPanelToggle({ className }: { className?: string }) {
  const { panelOpen, setPanelOpen, simActive } = useSimulation();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(className)}
      onClick={() => setPanelOpen(!panelOpen)}
      aria-expanded={panelOpen}
      aria-label={panelOpen ? "Collapse simulation panel" : "Open simulation panel"}
      title={panelOpen ? "Collapse simulation panel" : "Open simulation panel"}
    >
      {panelOpen ? <PanelRightClose data-icon="inline-start" /> : <PanelRightOpen data-icon="inline-start" />}
      Simulation
      {simActive ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-brand shadow-[0_0_6px_var(--brand)]"
        />
      ) : null}
    </Button>
  );
}
