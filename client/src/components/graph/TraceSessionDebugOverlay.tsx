import { useSyncExternalStore } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import type { TraceEvent } from "@/lib/traceSession";
import {
  getTraceTimelineSnapshot,
  subscribeTraceTimeline,
  type TracePhaseReport,
} from "@/lib/traceTimeline";

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
    case "WIRE_SIGNAL_START":
      return `signal ${event.tokenKey} (${event.edges.length} edges)`;
    case "PIN":
      return `pin ${event.tokenKey}`;
    default:
      return event.type;
  }
}

function verdictLabel(
  verdict: ReturnType<typeof getTraceTimelineSnapshot>["verdict"],
  hasPin: boolean,
): string {
  if (hasPin && verdict === "ok") return "CLICK — pin recorded";
  switch (verdict) {
    case "ok":
      return "OK — within budgets";
    case "slow":
      return "SLOW — phase over budget";
    case "incomplete":
      return "INCOMPLETE — signal ran but no commit";
    case "idle":
      return "IDLE — hold Ctrl to trace";
  }
}

function useTraceTimelineSnapshot() {
  return useSyncExternalStore(
    subscribeTraceTimeline,
    getTraceTimelineSnapshot,
    () => ({
      report: [],
      activeToken: null,
      shortToken: null,
      hoverHoldMs: null,
      workMs: 0,
      verdict: "idle" as const,
      slowPhases: [],
      ctrlTraceRan: false,
      traceCommitted: false,
    }),
  );
}

function formatMeasured(row: TracePhaseReport): string {
  if (row.syncMs != null) return `${row.syncMs} sync`;
  return `${row.deltaMs} gap`;
}

function PhaseRows({ rows }: { rows: readonly TracePhaseReport[] }) {
  const workRows = rows.filter(
    (row) => row.phase !== "pointerEnter" && row.phase !== "pointerLeave",
  );
  if (workRows.length === 0) return null;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pr-2 font-normal">step</th>
          <th className="pr-2 font-normal">ms</th>
          <th className="font-normal">bud</th>
        </tr>
      </thead>
      <tbody>
        {workRows.map((row) => (
          <tr
            key={row.id}
            className={
              row.overBudget
                ? "text-destructive"
                : row.phase === "litApplyRefresh"
                  ? "text-muted-foreground"
                  : undefined
            }
            title={row.detail}
          >
            <td className="pr-2">{row.label}</td>
            <td className="pr-2 tabular-nums">{formatMeasured(row)}</td>
            <td className="tabular-nums">{row.budgetMs ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Dev overlay — add ?trace-debug=1 to the URL. */
export function TraceSessionDebugOverlay() {
  const enabled = isTraceDebugEnabled();
  const { sessionMood, hoveredTokenKey, emphasisTokenKey, isWarm, debugEvents } =
    useGraphInteraction();
  const snapshot = useTraceTimelineSnapshot();

  if (!enabled) return null;

  const {
    report: timeline,
    shortToken,
    hoverHoldMs,
    workMs,
    verdict,
    slowPhases,
    ctrlTraceRan,
    traceCommitted,
  } = snapshot;

  const hasPin = timeline.some((row) => row.phase === "tokenPin");

  const traceHint =
    ctrlTraceRan || traceCommitted
      ? ctrlTraceRan
        ? " · Ctrl signal"
        : " · trace commit"
      : " · no trace";

  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 z-50 max-w-sm rounded-md border border-border bg-background/95 p-2 font-mono text-[10px] leading-snug text-foreground shadow-md"
      aria-hidden
    >
      <div className="mb-1 font-semibold text-brand">trace debug</div>

      <div
        className={
          verdict === "slow"
            ? "text-destructive"
            : verdict === "ok"
              ? "text-brand"
              : "text-muted-foreground"
        }
      >
        {verdictLabel(verdict, hasPin)}
      </div>

      <div className="mt-1 text-muted-foreground">token: {shortToken ?? "—"}</div>
      <div>
        mood: {sessionMood ?? "?"} · warm: {String(isWarm)}
        {traceHint}
      </div>
      <div>
        committed: {hoveredTokenKey ? "yes" : "—"} · pointer:{" "}
        {emphasisTokenKey ? "on chip" : "—"}
      </div>

      {timeline.length > 0 ? (
        <div className="mt-1 border-t border-border pt-1">
          <div className="mb-0.5 text-muted-foreground">
            work {workMs}ms
            {hoverHoldMs != null ? ` · held ${hoverHoldMs}ms` : ""}
            {sessionMood === "active" || sessionMood === "pending"
              ? " · live on leave"
              : ""}
          </div>
          <PhaseRows rows={timeline} />
          {slowPhases.length > 0 ? (
            <div className="mt-1 text-destructive">
              {slowPhases.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 border-t border-border pt-1 text-muted-foreground">
        {(debugEvents ?? []).slice(-5).map((event, i) => (
          <div key={`${event.type}-${i}`}>{eventLabel(event)}</div>
        ))}
      </div>
    </div>
  );
}
