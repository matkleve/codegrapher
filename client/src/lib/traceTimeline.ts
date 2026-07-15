/**
 * Hover interaction timeline — measurable phases vs traceMotion budgets.
 * Enable overlay: ?trace-debug=1. Last session also logs to console on hover clear.
 *
 * Uses User Timing marks (W3C Performance Timeline) for DevTools correlation.
 */
import { TRACE_MOTION } from "@/lib/traceMotion";

export type TracePhase =
  | "pointerEnter"
  | "signalEmit"
  | "wirePrime"
  | "wireDrawStart"
  | "dwellFire"
  | "traceCommit"
  | "litApply"
  | "litApplyRefresh"
  | "wireRevealed"
  | "pointerLeave"
  | "signalStop"
  | "hoverClear"
  | "tokenPin";

type TraceMark = { phase: TracePhase; t: number; detail?: string; syncMs?: number };

/** Same-frame budget when spec says 0ms — not flagged (gaps are scheduling, not work). */
const SYNC_FRAME_MS = 16;

/** Only these phases can trigger SLOW verdict (real work, not scheduling gaps). */
const VERDICT_PHASES = new Set<TracePhase>([
  "litApply",
  "wireRevealed",
  "traceCommit",
  "wirePrime",
]);

/** Overlay frozen during hover — updates on enter, pin, leave clear only. */
const OVERLAY_NOTIFY_PHASES = new Set<TracePhase>([
  "pointerEnter",
  "tokenPin",
  "hoverClear",
]);

const PHASE_LABEL: Record<TracePhase, string> = {
  pointerEnter: "pointer enter",
  signalEmit: "signal emit",
  wirePrime: "wire prime (sync DOM)",
  wireDrawStart: "wire draw start",
  dwellFire: "dwell fire",
  traceCommit: "trace commit",
  litApply: "lit apply (sync DOM)",
  litApplyRefresh: "lit refresh",
  wireRevealed: "wire revealed",
  pointerLeave: "pointer leave",
  signalStop: "signal stop",
  hoverClear: "hover clear",
  tokenPin: "token pin (click)",
};

/** Max ms from prior phase → this phase (spec budget from traceMotion.ts). */
const PHASE_BUDGET_MS: Partial<Record<TracePhase, number>> = {
  signalEmit: 0,
  wirePrime: 4,
  wireDrawStart: 8,
  dwellFire: TRACE_MOTION.dwellColdMs,
  traceCommit: 4,
  /** applyTraceLit synchronous DOM work — CSS enter (--motion-trace) is async. */
  litApply: SYNC_FRAME_MS,
  wireRevealed: TRACE_MOTION.wireRevealMs,
  hoverClear: TRACE_MOTION.wirePropagationDrainMs,
  tokenPin: 8,
};

export type TracePhaseReport = {
  id: string;
  phase: TracePhase;
  label: string;
  atMs: number;
  deltaMs: number;
  syncMs?: number;
  budgetMs?: number;
  overBudget: boolean;
  detail?: string;
};

let marks: TraceMark[] = [];
let activeToken: string | null = null;
let wireDrawMarked = false;
let wireRevealedMarked = false;
let signalStopMarked = false;
const listeners = new Set<() => void>();

const EMPTY_REPORT: TracePhaseReport[] = [];

export type TraceTimelineSnapshot = {
  report: readonly TracePhaseReport[];
  activeToken: string | null;
  /** Short label for overlay (function name, import path, etc.). */
  shortToken: string | null;
  /** Pointer down duration — user hold time, not CPU work. */
  hoverHoldMs: number | null;
  /** Sum of phase deltas excluding pointer enter/leave idle gap. */
  workMs: number;
  verdict: "ok" | "slow" | "incomplete" | "idle";
  slowPhases: readonly string[];
  ctrlTraceRan: boolean;
  traceCommitted: boolean;
};

let cachedSnapshot: TraceTimelineSnapshot = {
  report: EMPTY_REPORT,
  activeToken: null,
  shortToken: null,
  hoverHoldMs: null,
  workMs: 0,
  verdict: "idle",
  slowPhases: [],
  ctrlTraceRan: false,
  traceCommitted: false,
};

export function shortTokenKey(tokenKey: string): string {
  const lastColon = tokenKey.lastIndexOf(":");
  if (lastColon >= 0) {
    const tail = tokenKey.slice(lastColon + 1);
    if (tail && !tail.includes("/") && tail.length < 48) return tail;
  }
  const parts = tokenKey.split("::");
  const tail = parts[parts.length - 1];
  return tail && tail.length < 48 ? tail : tokenKey.slice(-40);
}

function buildTimelineSummary(
  report: TracePhaseReport[],
  tokenKey: string | null,
): Pick<
  TraceTimelineSnapshot,
  "shortToken" | "hoverHoldMs" | "workMs" | "verdict" | "slowPhases" | "ctrlTraceRan" | "traceCommitted"
> {
  const ctrlTraceRan = marks.some(
    (m) => m.phase === "signalEmit" || m.phase === "wirePrime" || m.phase === "wireDrawStart",
  );
  const traceCommitted = marks.some((m) => m.phase === "traceCommit");
  const enter = marks.find((m) => m.phase === "pointerEnter");
  const leave = marks.find((m) => m.phase === "pointerLeave");
  const hoverHoldMs =
    enter && leave ? Math.round((leave.t - enter.t) * 10) / 10 : null;

  const workMs = Math.round(
    report
      .filter((row) => VERDICT_PHASES.has(row.phase))
      .reduce((sum, row) => sum + (row.syncMs ?? row.deltaMs), 0) * 10,
  ) / 10;

  const slowPhases = report
    .filter((row) => row.overBudget && VERDICT_PHASES.has(row.phase))
    .map((row) => {
      const measured = row.syncMs ?? row.deltaMs;
      return `${row.label} ${measured}ms (bud ${row.budgetMs}ms)`;
    });

  let verdict: TraceTimelineSnapshot["verdict"] = "idle";
  if (marks.some((m) => m.phase === "tokenPin") && !ctrlTraceRan) {
    verdict = "ok";
  } else if (ctrlTraceRan || traceCommitted) {
    if (slowPhases.length > 0) verdict = "slow";
    else if (ctrlTraceRan && !traceCommitted) verdict = "incomplete";
    else verdict = "ok";
  }

  return {
    shortToken: tokenKey ? shortTokenKey(tokenKey) : null,
    hoverHoldMs,
    workMs,
    verdict,
    slowPhases,
    ctrlTraceRan,
    traceCommitted,
  };
}

function rebuildTraceTimelineSnapshot(): void {
  const report = buildTraceTimelineReport();
  const summary = buildTimelineSummary(report, activeToken);
  cachedSnapshot = {
    report: report.length === 0 ? EMPTY_REPORT : report,
    activeToken,
    ...summary,
  };
}

let notifyRaf = 0;
const perfWarnings: string[] = [];

function flushNotify(): void {
  notifyRaf = 0;
  rebuildTraceTimelineSnapshot();
  for (const listener of listeners) listener();
}

/** Batch overlay updates to one per frame — avoids INP death during debug. */
function notify(flush = false): void {
  const sync = flush || import.meta.env.VITEST;
  if (sync) {
    if (notifyRaf) {
      cancelAnimationFrame(notifyRaf);
      notifyRaf = 0;
    }
    flushNotify();
    return;
  }
  if (notifyRaf) return;
  notifyRaf = requestAnimationFrame(flushNotify);
}

function notePerfWarning(message: string): void {
  perfWarnings.push(message);
  if (perfWarnings.length > 24) perfWarnings.shift();
}

function dumpPerfWarnings(): void {
  if (perfWarnings.length === 0) return;
  console.groupCollapsed(`[trace] ${perfWarnings.length} browser perf notes`);
  for (const message of perfWarnings) console.warn(message);
  console.groupEnd();
  perfWarnings.length = 0;
}

export function getTraceTimelineSnapshot(): TraceTimelineSnapshot {
  return cachedSnapshot;
}

export function isTraceTimelineEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("trace-debug");
}

export function subscribeTraceTimeline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTraceTimelineMarks(): readonly TraceMark[] {
  return marks;
}

export function getActiveTraceToken(): string | null {
  return activeToken;
}

export function recordTokenPin(tokenKey: string): void {
  if (!isTraceTimelineEnabled()) return;
  activeToken = tokenKey;
  if (marks.length > 0) {
    markTracePhase("tokenPin", tokenKey);
    return;
  }
  const t = performance.now();
  wireDrawMarked = false;
  wireRevealedMarked = false;
  signalStopMarked = false;
  marks = [{ phase: "tokenPin", t, detail: tokenKey }];
  performance.mark("trace:tokenPin");
  notify(true);
}

export function beginTraceTimeline(tokenKey: string): void {
  if (!isTraceTimelineEnabled()) return;
  const t = performance.now();
  activeToken = tokenKey;
  wireDrawMarked = false;
  wireRevealedMarked = false;
  signalStopMarked = false;
  marks = [{ phase: "pointerEnter", t, detail: tokenKey }];
  performance.mark("trace:pointerEnter");
  notify(true);
}

/** First hop-1 wire stroke draw in this hover session. */
export function markWireDrawStartOnce(): void {
  if (wireDrawMarked || marks.length === 0) return;
  wireDrawMarked = true;
  markTracePhase("wireDrawStart");
}

/** First wire that finishes stroke reveal in this hover session. */
export function markWireRevealedOnce(drawWallMs?: number): void {
  if (wireRevealedMarked || marks.length === 0) return;
  wireRevealedMarked = true;
  markTracePhase("wireRevealed", undefined, drawWallMs);
}

export function markSignalStopOnce(): void {
  if (signalStopMarked || marks.length === 0) return;
  signalStopMarked = true;
  markTracePhase("signalStop");
}

/** Only the first lit apply per session — refreshes are omitted (strength/arrival). */
export function markLitApplyPhase(keyCount: number, syncMs: number): void {
  if (!isTraceTimelineEnabled() || marks.length === 0) return;
  if (marks.some((m) => m.phase === "litApply")) return;
  markTracePhase(
    "litApply",
    `${keyCount} keys · ${syncMs.toFixed(1)}ms sync`,
    syncMs,
  );
}

export function markTracePhase(
  phase: TracePhase,
  detail?: string,
  syncMs?: number,
): void {
  if (!isTraceTimelineEnabled() || marks.length === 0) return;
  const t = performance.now();
  marks.push({ phase, t, detail, syncMs });
  const seq = marks.filter((m) => m.phase === phase).length;
  const markName = seq > 1 ? `trace:${phase}:${seq}` : `trace:${phase}`;
  performance.mark(markName);
  try {
    const prev = marks[marks.length - 2];
    performance.measure(`trace:${prev.phase}→${phase}`, `trace:${prev.phase}`, `trace:${phase}`);
  } catch {
    // first mark pair may not exist in DevTools yet
  }
  const flush = OVERLAY_NOTIFY_PHASES.has(phase);
  notify(flush);
  if (phase === "hoverClear" && isTraceTimelineEnabled()) {
    snapshotPerfOnClear();
    logTraceTimelineReport();
    dumpPerfWarnings();
  }
}

function phaseOverBudget(
  phase: TracePhase,
  deltaMs: number,
  syncMs: number | undefined,
  budgetMs: number | undefined,
): boolean {
  if (
    phase === "pointerLeave" ||
    phase === "litApplyRefresh" ||
    phase === "signalStop" ||
    phase === "dwellFire" ||
    phase === "signalEmit" ||
    phase === "wireDrawStart"
  ) {
    return false;
  }
  if (budgetMs == null) return false;
  if (phase === "hoverClear") {
    const drain = TRACE_MOTION.wirePropagationDrainMs;
    return deltaMs > drain + 64;
  }
  if (!VERDICT_PHASES.has(phase)) return false;
  const measured = syncMs ?? deltaMs;
  const limit = budgetMs + 1;
  return measured > limit;
}

function buildTraceTimelineReport(): TracePhaseReport[] {
  if (marks.length === 0) return [];
  const t0 = marks[0].t;
  const out: TracePhaseReport[] = [];
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    const prev = i > 0 ? marks[i - 1] : null;
    const deltaMs = prev ? mark.t - prev.t : 0;
    const budgetMs = PHASE_BUDGET_MS[mark.phase];
    const roundedDelta = Math.round(deltaMs * 10) / 10;
    const roundedSync =
      mark.syncMs != null ? Math.round(mark.syncMs * 10) / 10 : undefined;
    out.push({
      id: `${i}-${mark.phase}`,
      phase: mark.phase,
      label: PHASE_LABEL[mark.phase],
      atMs: Math.round((mark.t - t0) * 10) / 10,
      deltaMs: roundedDelta,
      syncMs: roundedSync,
      budgetMs,
      overBudget: phaseOverBudget(mark.phase, roundedDelta, roundedSync, budgetMs),
      detail: mark.detail,
    });
  }
  return out;
}

export function logTraceTimelineReport(): void {
  const rows = buildTraceTimelineReport();
  if (rows.length === 0) return;
  const total = rows[rows.length - 1]?.atMs ?? 0;
  const violations = rows.filter((r) => r.overBudget);
  console.groupCollapsed(
    `[trace] hover timeline ${activeToken ?? "?"} — ${total}ms total` +
      (violations.length ? ` (${violations.length} over budget)` : ""),
  );
  console.table(
    rows.map((r) => ({
      phase: r.label,
      gap: r.deltaMs,
      sync: r.syncMs ?? "—",
      "at ms": r.atMs,
      budget: r.budgetMs ?? "—",
      over: r.overBudget ? "⚠" : "",
      detail: r.detail ?? "",
    })),
  );
  console.groupEnd();
}

export function resetTraceTimeline(): void {
  marks = [];
  activeToken = null;
  wireDrawMarked = false;
  wireRevealedMarked = false;
  signalStopMarked = false;
  perfWarnings.length = 0;
  notify(true);
}

/** One-shot perf read on hover end — no live PerformanceObserver overhead. */
function snapshotPerfOnClear(): void {
  const hoverEvents = new Set(["pointerover", "pointerout", "mouseenter", "mouseleave"]);
  try {
    const events = performance.getEntriesByType("event") as PerformanceEventTiming[];
    for (const e of events.slice(-12)) {
      if (!hoverEvents.has(e.name) || e.duration < 120) continue;
      const inputDelay = e.processingStart - e.startTime;
      const handlerMs = e.processingEnd - e.processingStart;
      notePerfWarning(
        `slow ${e.name} ${e.duration.toFixed(1)}ms — input ${inputDelay.toFixed(1)}ms, handler ${handlerMs.toFixed(1)}ms`,
      );
    }
  } catch {
    // unsupported
  }
}
