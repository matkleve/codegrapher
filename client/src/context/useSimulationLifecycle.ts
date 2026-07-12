import { useEffect } from "react";

/** DOM class + panel-tab side effects when simulation arms or runs. */
export function useSimulationLifecycle(simActive: boolean, setPanelTab: (tab: "run") => void) {
  useEffect(() => {
    document.documentElement.classList.toggle("graph-sim-active", simActive);
    return () => document.documentElement.classList.remove("graph-sim-active");
  }, [simActive]);

  useEffect(() => {
    if (simActive) setPanelTab("run");
  }, [simActive, setPanelTab]);
}
