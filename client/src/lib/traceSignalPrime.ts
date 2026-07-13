import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

export type TraceSignalPrimeArgs = {
  tokenKey: string;
  edges: PreviewEdgeSpec[];
};

const listeners = new Set<(args: TraceSignalPrimeArgs) => void>();

export function subscribeTraceSignalPrime(
  listener: (args: TraceSignalPrimeArgs) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Run wire + lit priming synchronously on hover (before React re-render). */
export function primeTraceSignal(args: TraceSignalPrimeArgs): void {
  for (const listener of listeners) listener(args);
}
