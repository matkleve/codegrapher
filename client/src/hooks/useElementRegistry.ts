import { useEffect, useSyncExternalStore, type RefObject } from "react";
import {
  getRegistryRevision,
  registerFlowAnchor,
  registerTraceHost,
  subscribeRegistry,
  unregisterElement,
} from "@/lib/elementRegistry";

/**
 * Bumps whenever the set of mounted trace hosts changes (member/class
 * expand/collapse). Consumers add it to trace-lit memo deps so revealed tokens
 * get lit — the wire re-resolves on its own rAF loop, but lit does not.
 */
export function useElementRegistryRevision(): number {
  return useSyncExternalStore(
    subscribeRegistry,
    getRegistryRevision,
    getRegistryRevision,
  );
}

/** Register / unregister a trace host on mount and when data-* identity changes. */
export function useTraceHostRegistration(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerTraceHost(el);
    return () => unregisterElement(el);
  }, [ref]);
}

/** Register a FlowAnchor element for handle-based preview wires. */
export function useFlowAnchorRegistration(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerFlowAnchor(el);
    return () => unregisterElement(el);
  }, [ref]);
}
