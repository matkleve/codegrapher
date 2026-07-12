import { useLayoutEffect, useRef } from "react";
import { useSimulationOptional } from "@/context/SimulationContext";
import { clearFlowPoints, syncFlowPoints } from "@/lib/flowPointDom";
import { prefersReducedMotion, substepIntervalMs } from "@/lib/simSubstepTiming";

/**
 * C3's flow-point layer — mirrors `PreviewEdgeOverlay`'s rAF/anchor-
 * measurement pattern (see the canvas-values supplement, "Anchor contract"):
 * a plain full-pane SVG that measures `[data-sim-anchor]` spans live each
 * frame, no registry. Renders only while a statement's substeps are
 * actively auto-playing (see `SimulationContext`'s `useSubstepPlayer`).
 */
export function FlowPointOverlay() {
  const sim = useSimulationOptional();
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<Map<number, SVGCircleElement>>(new Map());
  const litRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0);
  const substepStartRef = useRef(0);

  const active = Boolean(sim?.simActive && sim.session && sim.substepIndex < sim.flowSubsteps.length);
  const substep = active ? sim!.flowSubsteps[sim!.substepIndex] : undefined;
  const substepKey = active
    ? `${sim!.session!.currentIndex}:${sim!.substepIndex}`
    : null;
  const durationMs = sim ? substepIntervalMs(sim.playbackSpeed) : 0;

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const points = pointsRef.current;
    if (!svg || !substep) {
      clearFlowPoints(points, litRef);
      return;
    }

    substepStartRef.current = performance.now();
    const reduced = prefersReducedMotion();

    const tick = (): void => {
      const box = svg.getBoundingClientRect();
      const elapsed = performance.now() - substepStartRef.current;
      const t = reduced ? 1 : Math.min(1, durationMs > 0 ? elapsed / durationMs : 1);
      syncFlowPoints(svg, points, substep, box, litRef, t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearFlowPoints(points, litRef);
    };
  }, [substep, substepKey, durationMs]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-40 overflow-visible"
      aria-hidden
    />
  );
}
