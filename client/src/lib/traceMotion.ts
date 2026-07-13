import { EASE_TRACE_OUT, MOTION_TRACE_MS, MOTION_TRACE_OUT_MS, MOTION_TRACE_PENDING_MS } from "@/lib/motionTokens";
import { TRACE_TUNING } from "@/lib/traceDepth";

/**
 * Trace hover motion orchestration — single timeline for JS timers + CSS tokens.
 * Phases: pending (instant) → dwell (cold only) → commit → wire ghost+draw → exit.
 */
export const TRACE_MOTION = {
  /** Accidental-hover guard on first entry; warm/Ctrl/re-focus skip via `fireDelayMs`. */
  dwellColdMs: 0,
  dwellWarmMs: 0,
  /** Surround dim + lit chip enter (`--motion-trace`). */
  enterMs: MOTION_TRACE_MS,
  /** Pending surround dim — snappier than full commit (`--motion-trace-pending`). */
  enterPendingMs: MOTION_TRACE_PENDING_MS,
  /** Lit unwind + wire retire (`--motion-trace-out`). */
  exitMs: MOTION_TRACE_OUT_MS,
  exitEase: EASE_TRACE_OUT,
  /** Wire stroke draw after commit (WAAPI; ghost visible from frame 0). */
  wireRevealMs: 120,
  /** Graph-hop propagation from core (wave outward). */
  wireHopStaggerMs: 45,
  wireFanStaggerMs: 12,
  wireGhostOpacity: 0.38,
  /** After pointer leave: keep edges alive while in-flight signals finish. */
  wirePropagationDrainMs: 320,
  /** Token info bar — decoupled from trace pixels. */
  infoDelayMs: 280,
  /** Pending chip fill (`TRACE_TUNING.pending.chipAtPending`). */
  pendingChipStrength: TRACE_TUNING.pending.chipAtPending,
} as const;

export const FIRE_COLD_MS = TRACE_MOTION.dwellColdMs;
export const FIRE_WARM_MS = TRACE_MOTION.dwellWarmMs;
export const INFO_DELAY_MS = TRACE_MOTION.infoDelayMs;
export const WIRE_REVEAL_MS = TRACE_MOTION.wireRevealMs;
export const WIRE_REVEAL_HOP_MS = TRACE_MOTION.wireHopStaggerMs;
export const WIRE_REVEAL_STAGGER_MS = TRACE_MOTION.wireFanStaggerMs;
export const WIRE_REVEAL_GHOST_OPACITY = TRACE_MOTION.wireGhostOpacity;
export const WIRE_PROPAGATION_DRAIN_MS = TRACE_MOTION.wirePropagationDrainMs;
