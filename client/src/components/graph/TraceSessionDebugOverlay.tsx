import { useSyncExternalStore } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { subscribeTraceSessionMood } from "@/lib/traceSessionMood";
import type { TraceEvent } from "@/lib/traceSession";

function isTraceDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("trace-debug");
}

function eventLabel(event: TraceEvent): string {
  switch (event.type) {
    case "POINTER_ENTER":
      return `enter ${event.tokenKey}${event.instant ? " (instant)" : ""}`;
    case "POINTER_LEAVE":
      return `leave ${event.tokenKey}`;
    case "TRACE_COMMIT":
      return `commit ${event.tokenKey} (${event.edges.length} edges)`;
    default:
      return event.type;
  }
}

/** Dev overlay — add ?trace-debug=1 to the URL. */
export function TraceSessionDebugOverlay() {
  const enabled = isTraceDebugEnabled();
  const { sessionMood, hoveredTokenKey, emphasisTokenKey, isWarm, debugEvents } =
    useGraphInteraction();

  useSyncExternalStore(subscribeTraceSessionMood, () => true, () => false);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 z-50 max-w-sm rounded-md border border-border bg-background/95 p-2 font-mono text-[10px] leading-snug text-foreground shadow-md"
      aria-hidden
    >
      <div className="mb-1 font-semibold text-brand">trace session</div>
      <div>mood: {sessionMood ?? "?"}</div>
      <div>committed: {hoveredTokenKey ?? "—"}</div>
      <div>pointer: {emphasisTokenKey ?? "—"}</div>
      <div>warm: {String(isWarm)}</div>
      <div className="mt-1 border-t border-border pt-1 text-muted-foreground">
        {(debugEvents ?? []).slice(-8).map((event, i) => (
          <div key={`${event.type}-${i}`}>{eventLabel(event)}</div>
        ))}
      </div>
    </div>
  );
}
