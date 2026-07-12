import { traceStrength } from "@/lib/traceDepth";
import {
  isTracePendingMood,
  subscribeTraceSessionMood,
} from "@/lib/traceSessionMood";
import { CHIP_PENDING_TRACE, TRACE_STRENGTH_VAR } from "@/lib/traceLitApply";

let pendingHost: HTMLElement | null = null;
const pendingListeners = new Set<() => void>();

function notifyPending(): void {
  for (const listener of pendingListeners) listener();
}

function syncPendingStrength(host: HTMLElement | null): void {
  if (!host) return;
  host.style.setProperty(
    TRACE_STRENGTH_VAR,
    String(traceStrength("pending", "chip", 1)),
  );
}

function clearPendingStrength(host: HTMLElement | null): void {
  host?.style.removeProperty(TRACE_STRENGTH_VAR);
}

/** Instant hover-preview wash while dwell timer runs (before trace commits). */
export function setPendingTraceHost(host: HTMLElement | null): void {
  if (pendingHost && pendingHost !== host) {
    pendingHost.classList.remove(CHIP_PENDING_TRACE);
    clearPendingStrength(pendingHost);
  }
  pendingHost = host;
  if (host) {
    host.classList.add(CHIP_PENDING_TRACE);
    syncPendingStrength(host);
  }
  notifyPending();
}

export function clearPendingTraceHost(): void {
  if (pendingHost) {
    pendingHost.classList.remove(CHIP_PENDING_TRACE);
    clearPendingStrength(pendingHost);
  }
  pendingHost = null;
  notifyPending();
}

export function subscribeTracePending(listener: () => void): () => void {
  pendingListeners.add(listener);
  const unsubMood = subscribeTraceSessionMood(listener);
  return () => {
    pendingListeners.delete(listener);
    unsubMood();
  };
}

export function isTracePending(): boolean {
  return isTracePendingMood();
}
