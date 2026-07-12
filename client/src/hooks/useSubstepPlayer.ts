import { useEffect, useMemo, useRef, useState } from "react";
import { buildStepFlow, type FlowSubstep } from "@/lib/staticWalk/buildStepFlow";
import { substepIntervalMs, SUBSTEP_MS } from "@/lib/simSubstepTiming";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { PlaybackSpeed, SimStep } from "@/lib/staticWalk/types";

/** Shimmer runs longer while waiting on a call that would need step-into. */
const FALLBACK_MS = SUBSTEP_MS * 2;
const FALLBACK_CALL_MS = SUBSTEP_MS * 4;

export type SubstepPlayerState = {
  /** This statement's expression flow graph — empty means undecomposable (C-alt). */
  flowSubsteps: FlowSubstep[];
  /** How many substeps have completed; `>= flowSubsteps.length` means settled. */
  substepIndex: number;
  /** True once the auto-play sequence has finished (or there was nothing to play). */
  settled: boolean;
  /** True when the line has a binding but its RHS didn't decompose — C-alt shimmer. */
  undecomposable: boolean;
  /** C-alt only: false while shimmering, true once the fallback line "lights". */
  fallbackLit: boolean;
  /** C-alt only: shimmer cycle length in ms — slower while awaiting a call. */
  fallbackShimmerMs: number;
};

const SETTLED: SubstepPlayerState = {
  flowSubsteps: [],
  substepIndex: 0,
  settled: true,
  undecomposable: false,
  fallbackLit: true,
  fallbackShimmerMs: FALLBACK_MS,
};

/**
 * Drives C3's statement-mode auto-play and the coupled C-alt fallback:
 * whenever the active step changes, decompose its binding into an
 * expression flow graph and step through it once at `SUBSTEP_MS` pace, then
 * settle (see canvas-values supplement, "Substep model" — statement
 * stepping auto-plays all substeps, then settles; substep-by-substep
 * stepping is C4, not built here). When the RHS is undecomposable, shimmer
 * for a beat instead, then light (see "Alternative — shimmer while
 * computing").
 */
export function useSubstepPlayer(
  step: SimStep | undefined,
  active: boolean,
  playbackSpeed: PlaybackSpeed,
): SubstepPlayerState {
  const binding = step?.detail.calculated[0];

  const flowSubsteps = useMemo(() => {
    if (!step || !binding) return [];
    const tokens = tokenizeLine(step.text).tokens;
    return buildStepFlow(step.lineNumber, tokens, binding, step.detail.reads);
  }, [step, binding]);

  const undecomposable = Boolean(binding) && flowSubsteps.length === 0;
  const awaitingCall = undecomposable && (binding?.expression.includes("(") ?? false);
  const fallbackShimmerMs = awaitingCall ? FALLBACK_CALL_MS : FALLBACK_MS;

  const [substepIndex, setSubstepIndex] = useState(flowSubsteps.length);
  const [fallbackLit, setFallbackLit] = useState(!undecomposable);
  const intervalRef = useRef(0);
  const timeoutRef = useRef(0);

  useEffect(() => {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(timeoutRef.current);

    if (!active) {
      setSubstepIndex(0);
      setFallbackLit(true);
      return;
    }

    if (flowSubsteps.length > 0) {
      setFallbackLit(true);
      setSubstepIndex(0);
      let i = 0;
      intervalRef.current = window.setInterval(() => {
        i += 1;
        setSubstepIndex(i);
        if (i >= flowSubsteps.length) window.clearInterval(intervalRef.current);
      }, substepIntervalMs(playbackSpeed));
      return () => window.clearInterval(intervalRef.current);
    }

    setSubstepIndex(0);
    if (!undecomposable) {
      setFallbackLit(true);
      return;
    }
    setFallbackLit(false);
    timeoutRef.current = window.setTimeout(() => setFallbackLit(true), fallbackShimmerMs);
    return () => window.clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playbackSpeed excluded so an in-flight sequence keeps its already-elapsed cadence instead of restarting on a speed change
  }, [flowSubsteps, active, undecomposable, fallbackShimmerMs]);

  if (!active) return SETTLED;
  return {
    flowSubsteps,
    substepIndex,
    settled: substepIndex >= flowSubsteps.length,
    undecomposable,
    fallbackLit,
    fallbackShimmerMs,
  };
}
