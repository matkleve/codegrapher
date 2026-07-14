/**
 * One-shot hover-prime event — run wire + lit priming synchronously on hover
 * (before React re-render). Implementation now lives in `traceEngine`.
 */
export type { TraceSignalPrimeArgs } from "@/lib/trace/traceEngine";
export {
  subscribeTraceSignalPrime,
  primeTraceSignal,
} from "@/lib/trace/traceEngine";
