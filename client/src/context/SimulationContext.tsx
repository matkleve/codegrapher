import { createContext, useContext } from "react";
import {
  useSimulationController,
  type SimulationProviderProps,
} from "@/context/useSimulationController";
import type { SimulationContextValue } from "@/context/simulationTypes";

export type { SimAnchor } from "@/context/simulationTypes";

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: SimulationProviderProps) {
  const value = useSimulationController();
  return (
    <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within SimulationProvider");
  }
  return ctx;
}

export function useSimulationOptional(): SimulationContextValue | null {
  return useContext(SimulationContext);
}
