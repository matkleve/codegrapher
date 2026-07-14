/**
 * Pane mood mirror (idle / pending / active / leaving) + DOM-fading flag.
 * State now lives in `traceEngine`; this module is the stable public entry point.
 */
export {
  setTraceSessionMood,
  getTraceSessionMood,
  setTraceDomFading,
  isTraceDomFading,
  subscribeTraceSessionMood,
  isTracePendingMood,
  isTraceLeavingMood,
} from "@/lib/trace/traceEngine";
