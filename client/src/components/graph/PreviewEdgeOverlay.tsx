import { useLayoutEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useJumpTooltip } from "@/context/JumpTooltipContext";
import { commitTokenPin } from "@/hooks/useTokenTrace";
import { makeTokenInfoFromJumpTarget } from "@/lib/tokenContextInfo";
import {
  jumpTargetForWireEnd,
  jumpTargetLabel,
  resolveJumpTargetElement,
  traceKeyForJumpTarget,
} from "@/lib/resolveJumpTarget";
import {
  syncWireDom,
  updateWireGeometry,
  type WireElements,
} from "@/lib/previewEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

export function PreviewEdgeOverlay() {
  const {
    previewEdges,
    isWarm,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
    pinTrace,
    beginTrace,
    showTokenInfo,
    focusFlowNode,
  } = useGraphInteraction();
  const { setJumpTooltip } = useJumpTooltip();
  const { getNode } = useReactFlow();
  const svgRef = useRef<SVGSVGElement>(null);
  const wiresRef = useRef<Map<string, WireElements>>(new Map());
  const specsRef = useRef<PreviewEdgeSpec[]>([]);
  const prevEdgeCountRef = useRef(0);

  const bindHitHandlers = (wire: WireElements) => {
    const spec = wire.spec;
    const onEnter = (end: "from" | "to") => (e: MouseEvent) => {
      cancelHoverLeaveGrace();
      const { ref, hint } = jumpTargetForWireEnd(spec, end, getNode);
      setJumpTooltip({
        token: jumpTargetLabel(ref, hint, getNode),
        kind: spec.kind,
        x: e.clientX,
        y: e.clientY,
      });
    };
    const onMove = (e: MouseEvent) => {
      setJumpTooltip((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY } : prev,
      );
    };
    const onLeave = () => {
      setJumpTooltip(null);
      scheduleHoverLeaveGrace();
    };
    const onClick = (end: "from" | "to") => (e: MouseEvent) => {
      e.stopPropagation();
      const { ref, hint } = jumpTargetForWireEnd(spec, end, getNode);
      const el = resolveJumpTargetElement(ref, hint, getNode);
      if (!el) return;
      const traceKey = traceKeyForJumpTarget(el, hint);
      if (!traceKey) return;
      const flowNodeId = hint?.flowNodeId;
      commitTokenPin({
        pinTrace,
        showTokenInfo,
        tokenKey: traceKey,
        onFire: () => beginTrace(traceKey, [spec]),
        buildPinInfo: () =>
          makeTokenInfoFromJumpTarget(el, hint, spec.kind, true),
        animateEl: el,
      });
      if (flowNodeId) focusFlowNode(flowNodeId);
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      setJumpTooltip(null);
    };

    wire.hitFrom.onmouseenter = onEnter("from");
    wire.hitFrom.onmousemove = onMove;
    wire.hitFrom.onmouseleave = onLeave;
    wire.hitFrom.onclick = onClick("from");
    wire.hitTo.onmouseenter = onEnter("to");
    wire.hitTo.onmousemove = onMove;
    wire.hitTo.onmouseleave = onLeave;
    wire.hitTo.onclick = onClick("to");
  };

  useLayoutEffect(() => {
    specsRef.current = previewEdges;
    const svg = svgRef.current;
    if (!svg || previewEdges.length === 0) {
      for (const wire of wiresRef.current.values()) wire.group.remove();
      wiresRef.current.clear();
      prevEdgeCountRef.current = 0;
      return;
    }

    let layer = svg.querySelector<SVGGElement>("[data-preview-wires]");
    if (!layer) {
      layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layer.setAttribute("data-preview-wires", "");
      svg.append(layer);
    }

    const warm = isWarm && prevEdgeCountRef.current > 0;
    syncWireDom(layer, previewEdges, wiresRef.current, warm);
    prevEdgeCountRef.current = previewEdges.length;
    for (const wire of wiresRef.current.values()) {
      bindHitHandlers(wire);
    }
  }, [previewEdges, isWarm]);

  useLayoutEffect(() => {
    if (previewEdges.length === 0) return;

    let raf = 0;
    const tick = () => {
      const svg = svgRef.current;
      if (!svg) return;
      const box = svg.getBoundingClientRect();
      for (const spec of specsRef.current) {
        const wire = wiresRef.current.get(spec.id);
        if (wire) updateWireGeometry(wire, box, getNode);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [getNode, previewEdges.length]);

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
    </svg>
  );
}
