import type { FlowAnchor, FlowSubstep } from "@/lib/staticWalk/buildStepFlow";
import { pointOnArc } from "@/lib/flowArcPath";
import { flowPointColor } from "@/lib/flowPointColors";
import type { SemanticTokenKind } from "@/lib/tokenColors";

const SVG_NS = "http://www.w3.org/2000/svg";
const LIT_CLASS = "sim-flow-anchor-lit";

export type LitAnchorRef = { current: HTMLElement | null };

/**
 * Live per-frame anchor resolution — no registry, per the Anchor contract's
 * "Resolved (normative)" decision table. Works uniformly for both the new
 * operator/literal `data-sim-anchor` spans and identifier `TokenChip`s
 * (which also carry the attribute via its `simAnchor` prop).
 */
export function resolveSimAnchorEl(anchor: FlowAnchor): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `.graph-pane [data-sim-anchor="${anchor.line}:${anchor.tokenIndex}"]`,
  );
}

function semanticKindOf(el: HTMLElement): SemanticTokenKind | undefined {
  const kind = el.dataset.tokenKind;
  return kind === "class" || kind === "function" || kind === "type" || kind === "variable"
    ? kind
    : undefined;
}

function centerOf(el: HTMLElement, box: DOMRect): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
}

function ensureCircle(
  svg: SVGSVGElement,
  points: Map<number, SVGCircleElement>,
  index: number,
): SVGCircleElement {
  let circle = points.get(index);
  if (!circle) {
    circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "sim-flow-point");
    svg.appendChild(circle);
    points.set(index, circle);
  }
  return circle;
}

function setLit(litRef: LitAnchorRef, el: HTMLElement | null): void {
  if (litRef.current === el) return;
  litRef.current?.classList.remove(LIT_CLASS);
  el?.classList.add(LIT_CLASS);
  litRef.current = el;
}

export function clearFlowPoints(points: Map<number, SVGCircleElement>, litRef: LitAnchorRef): void {
  for (const circle of points.values()) circle.remove();
  points.clear();
  setLit(litRef, null);
}

/**
 * Imperative per-frame sync, mirroring `previewEdgeDom.ts`: measure live
 * `[data-sim-anchor]` elements, position + colour each source's travelling
 * point along a slight arc, and flash the target anchor once every point in
 * the substep has arrived (synchronized arrival — see the supplement).
 * A `fetch` substep has no intra-line source (its value arrives via the
 * existing transport pulse), so it only flashes the target — no point.
 */
export function syncFlowPoints(
  svg: SVGSVGElement,
  points: Map<number, SVGCircleElement>,
  substep: FlowSubstep,
  box: DOMRect,
  litRef: LitAnchorRef,
  t: number,
): void {
  const targetEl = resolveSimAnchorEl(substep.target);

  if (substep.source.length === 0) {
    clearFlowPoints(points, litRef);
    setLit(litRef, targetEl);
    return;
  }

  if (!targetEl) {
    clearFlowPoints(points, litRef);
    return;
  }
  const targetPos = centerOf(targetEl, box);

  const seen = new Set<number>();
  substep.source.forEach((src, index) => {
    const sourceEl = resolveSimAnchorEl(src);
    if (!sourceEl) return;
    seen.add(index);
    const sourcePos = centerOf(sourceEl, box);
    const pos = pointOnArc(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, t);
    const circle = ensureCircle(svg, points, index);
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.style.fill = flowPointColor(substep, semanticKindOf(sourceEl));
    circle.style.opacity = t >= 1 ? "0" : "1";
  });

  for (const [index, circle] of points) {
    if (!seen.has(index)) {
      circle.remove();
      points.delete(index);
    }
  }

  setLit(litRef, t >= 1 ? targetEl : null);
}
