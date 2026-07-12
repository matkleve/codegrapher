import { CHIP_PENDING_TRACE } from "@/lib/traceLitApply";

let pendingHost: HTMLElement | null = null;

/** Instant hover-preview wash while dwell timer runs (before trace commits). */
export function setPendingTraceHost(host: HTMLElement | null): void {
  if (pendingHost && pendingHost !== host) {
    pendingHost.classList.remove(CHIP_PENDING_TRACE);
  }
  pendingHost = host;
  host?.classList.add(CHIP_PENDING_TRACE);
}

export function clearPendingTraceHost(): void {
  pendingHost?.classList.remove(CHIP_PENDING_TRACE);
  pendingHost = null;
}
