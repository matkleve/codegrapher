import { useMemo } from "react";
import { useSimulationOptional } from "@/context/SimulationContext";
import { inlineValuesForStep } from "@/lib/staticWalk/inlineValues";
import type { CodeLineProps } from "@/components/code/codeLineTypes";

export function useCodeLineSimulation({
  memberId,
  lineNumber,
}: Pick<CodeLineProps, "memberId" | "lineNumber">) {
  const sim = useSimulationOptional();
  const simStep =
    sim?.simActive && sim.session?.memberId === memberId
      ? sim.session.steps[sim.session.currentIndex]
      : undefined;
  const isSimCurrent = simStep?.lineNumber === lineNumber;
  const simInlineValues = isSimCurrent && simStep ? inlineValuesForStep(simStep) : [];
  const simWriteNames =
    isSimCurrent && simStep ? new Set(simStep.detail.writes.map((w) => w.name)) : null;
  const simReadNames =
    isSimCurrent && simStep ? new Set(simStep.detail.reads.map((r) => r.name)) : null;
  const simTokenClass = (name: string): string | undefined => {
    if (simWriteNames?.has(name)) return "sim-token-write";
    if (simReadNames?.has(name)) return "sim-token-read";
    return undefined;
  };
  const inSimRange = sim?.isLineInSimRange(memberId, lineNumber) ?? false;

  // C3 anchor markup: only the tokens this statement's flow graph actually
  // targets (operators, the assignment `=`, literal operands) — never
  // parens/commas/keywords (see canvas-values supplement, Anchor contract).
  const simAnchorIndices = useMemo(() => {
    if (!isSimCurrent || !sim) return null;
    const indices = new Set<number>();
    for (const step of sim.flowSubsteps) {
      if (step.target.line === lineNumber) indices.add(step.target.tokenIndex);
      for (const src of step.source) {
        if (src.line === lineNumber) indices.add(src.tokenIndex);
      }
    }
    return indices.size > 0 ? indices : null;
  }, [isSimCurrent, lineNumber, sim]);
  const simAnchorFor = (idx: number): string | undefined =>
    simAnchorIndices?.has(idx) ? `${lineNumber}:${idx}` : undefined;
  const simShimmering = isSimCurrent && !!sim?.substepUndecomposable && !sim.substepFallbackLit;

  return {
    sim,
    isSimCurrent,
    simInlineValues,
    simTokenClass,
    inSimRange,
    simAnchorFor,
    simShimmering,
  };
}
