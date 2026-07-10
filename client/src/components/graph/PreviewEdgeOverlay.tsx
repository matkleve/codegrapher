import { useLayoutEffect, useRef, useState } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { cubicPath, resolvePreviewAnchor, wireHitSegment } from "@/lib/resolvePreviewAnchor";
import { toFlowId } from "@/lib/graphIds";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

type RenderedEdge = {
  spec: PreviewEdgeSpec;
  path: string;
  glowPath: string;
  stroke: string;
  hitFrom: string;
  hitTo: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

function measureEdges(
  specs: PreviewEdgeSpec[],
  svgEl: SVGSVGElement,
): RenderedEdge[] {
  const box = svgEl.getBoundingClientRect();
  const rendered: RenderedEdge[] = [];

  for (const spec of specs) {
    const from = resolvePreviewAnchor(spec.from, box, "from");
    const to = resolvePreviewAnchor(spec.to, box, "to");
    if (!from || !to) continue;

    const path = cubicPath(from.x, from.y, to.x, to.y, from.side, to.side);
    rendered.push({
      spec,
      path,
      glowPath: path,
      stroke: TOKEN_EDGE_STROKE[spec.kind],
      hitFrom: wireHitSegment(from.x, from.y, to.x, to.y, "from"),
      hitTo: wireHitSegment(from.x, from.y, to.x, to.y, "to"),
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
    });
  }

  return rendered;
}

export function PreviewEdgeOverlay() {
  const {
    previewEdges,
    jumpTooltip,
    setJumpTooltip,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
    showTokenInfo,
    pinTrace,
    graphData,
  } = useGraphInteraction();
  const svgRef = useRef<SVGSVGElement>(null);
  const [edges, setEdges] = useState<RenderedEdge[]>([]);

  useLayoutEffect(() => {
    if (previewEdges.length === 0) {
      setEdges([]);
      return;
    }

    const update = () => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      setEdges(measureEdges(previewEdges, svgEl));
    };

    let raf = 0;
    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [previewEdges]);

  const onHitEnter = (
    e: React.MouseEvent,
    spec: PreviewEdgeSpec,
    end: "from" | "to",
  ) => {
    cancelHoverLeaveGrace();
    const targetRef = end === "to" ? spec.to : spec.from;
    const token =
      targetRef.type === "element"
        ? (targetRef.el.dataset.symbolName ?? "")
        : "";
    setJumpTooltip({
      token,
      kind: spec.kind,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const onHitMove = (e: React.MouseEvent) => {
    if (!jumpTooltip) return;
    setJumpTooltip({
      ...jumpTooltip,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const onHitLeave = () => {
    setJumpTooltip(null);
    scheduleHoverLeaveGrace();
  };

  const onHitClick = (
    e: React.MouseEvent,
    spec: PreviewEdgeSpec,
    end: "from" | "to",
  ) => {
    e.stopPropagation();
    const targetRef = end === "to" ? spec.to : spec.from;
    if (targetRef.type !== "element" || !targetRef.el) return;
    const el = targetRef.el;
    const flowNodeId =
      el.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ?? "";
    const graphNode = graphData?.nodes.find((n) => toFlowId(n.id) === flowNodeId);
    const traceKey = el.dataset.traceKey;
    if (traceKey) pinTrace(traceKey);
    showTokenInfo(
      makeTokenInfo({
        token: el.dataset.symbolName ?? "",
        kind: spec.kind,
        pinned: true,
        connectionCount: 1,
        definedIn: graphNode?.label ?? "",
        filePath: graphNode?.filePath ?? "",
        line: 1,
        sourceFlowId: flowNodeId,
        sourceGraphNodeId: graphNode?.id ?? "",
        role: el.dataset.symbolRole === "definition" ? "definition" : "usage",
      }),
    );
    el.animate(
      [{ filter: "brightness(1.7)" }, { filter: "brightness(1)" }],
      { duration: 520, easing: "ease-out" },
    );
    setJumpTooltip(null);
  };

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-40 overflow-visible"
      aria-hidden
    >
      <defs>
        <marker
          id="preview-edge-arrow"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
        >
          <path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke" />
        </marker>
      </defs>
      {edges.map((edge) => (
        <g key={edge.spec.id}>
          <path
            d={edge.glowPath}
            fill="none"
            className="preview-edge-glow"
            style={{ stroke: edge.stroke }}
          />
          <path
            d={edge.path}
            fill="none"
            className="preview-edge-path"
            style={{ stroke: edge.stroke }}
            markerEnd="url(#preview-edge-arrow)"
          />
          <path
            d={edge.hitFrom}
            className="preview-edge-hit"
            onMouseEnter={(e) => onHitEnter(e, edge.spec, "from")}
            onMouseMove={onHitMove}
            onMouseLeave={onHitLeave}
            onClick={(e) => onHitClick(e, edge.spec, "from")}
          />
          <path
            d={edge.hitTo}
            className="preview-edge-hit"
            onMouseEnter={(e) => onHitEnter(e, edge.spec, "to")}
            onMouseMove={onHitMove}
            onMouseLeave={onHitLeave}
            onClick={(e) => onHitClick(e, edge.spec, "to")}
          />
        </g>
      ))}
    </svg>
  );
}
