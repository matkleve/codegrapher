import { useEffect, type RefObject } from "react";
import { registerFlowAnchor, registerTraceHost, unregisterElement } from "@/lib/elementRegistry";

/** Register / unregister a trace host on mount and when data-* identity changes. */
export function useTraceHostRegistration(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerTraceHost(el);
    return () => unregisterElement(el);
  });
}

/** Register a FlowAnchor element for handle-based preview wires. */
export function useFlowAnchorRegistration(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerFlowAnchor(el);
    return () => unregisterElement(el);
  });
}
