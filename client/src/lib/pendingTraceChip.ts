import { CHIP_PENDING_TRACE } from "@/lib/traceLitApply";

let pendingHost: HTMLElement | null = null;
const pendingListeners = new Set<() => void>();

function notifyPending(): void {
  for (const listener of pendingListeners) listener();
}

/** Instant hover-preview wash while dwell timer runs (before trace commits). */
export function setPendingTraceHost(host: HTMLElement | null): void {
  if (pendingHost && pendingHost !== host) {
    pendingHost.classList.remove(CHIP_PENDING_TRACE);
  }
  pendingHost = host;
  host?.classList.add(CHIP_PENDING_TRACE);
  notifyPending();
}

export function clearPendingTraceHost(): void {
  pendingHost?.classList.remove(CHIP_PENDING_TRACE);
  pendingHost = null;
  notifyPending();
}

export function subscribeTracePending(listener: () => void): () => void {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
}

export function isTracePending(): boolean {
  return pendingHost != null;
}
