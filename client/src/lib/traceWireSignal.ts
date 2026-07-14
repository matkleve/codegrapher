/**
 * Wire signal emitter — propagation clock for preview edges.
 * State now lives in `traceEngine`; this module is the stable public entry point.
 */
export {
  startWireSignalEpoch,
  stopWireSignalEmitting,
  keepWireSignalAlive,
  resetWireSignal,
  isWireSignalEmitting,
  getWireSignalEpoch,
  wireSignalElapsedDelay,
} from "@/lib/trace/traceEngine";
