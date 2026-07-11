import { useLayoutEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useJumpTooltip } from "@/context/JumpTooltipContext";
import { useJumpClick } from "@/hooks/useJumpClick";
import { jumpTargetForWireEnd, jumpTargetLabel } from "@/lib/resolveJumpTarget";
import {
  createWireEngine,
  registerWireEngine,
  type WireEngine,
} from "@/lib/wireEngine";
import { syncWireDom, updateWireGeometry, type WireElements } from "@/lib/previewEdgeDom";
import {
  syncStructuralWireDom,
  updateStructuralWireGeometry,
  type StructuralWireElements,
} from "@/lib/structuralEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";

export function PreviewEdgeOverlay() {
  const {
    previewEdges,
    structuralEdges,
    pulseEdges,
    isWarm,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
  } = useGraphInteraction();
  const { setJumpTooltip } = useJumpTooltip();
  const { getNode } = useReactFlow();
  const onWireClick = useJumpClick();
  const svgRef = useRef<SVGSVGElement>(null);
  const wiresRef = useRef<Map<string, WireElements>>(new Map());
  const structuralWiresRef = useRef<Map<string, StructuralWireElements>>(new Map());
  const specsRef = useRef<PreviewEdgeSpec[]>([]);
  const structuralSpecsRef = useRef<StructuralEdgeSpec[]>([]);
  const prevEdgeCountRef = useRef(0);
  const engineRef = useRef<WireEngine | null>(null);

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

    wire.hitFrom.onmouseenter = onEnter("from");
    wire.hitFrom.onmousemove = onMove;
    wire.hitFrom.onmouseleave = onLeave;
    wire.hitFrom.onclick = onWireClick(spec, "from");
    wire.hitTo.onmouseenter = onEnter("to");
    wire.hitTo.onmousemove = onMove;
    wire.hitTo.onmouseleave = onLeave;
    wire.hitTo.onclick = onWireClick(spec, "to");
  };

  const allStructuralSpecs = [...structuralEdges, ...pulseEdges];

  useLayoutEffect(() => {
    const engine = createWireEngine({
      getSvg: () => svgRef.current,
      getNode,
      layers: [
        {
          getSpecs: () => specsRef.current,
          getWires: () => wiresRef.current,
          update: (wire, box, node) =>
            updateWireGeometry(wire as WireElements, box, node, specsRef.current),
        },
        {
          getSpecs: () => structuralSpecsRef.current,
          getWires: () => structuralWiresRef.current,
          update: (wire, box, node) =>
            updateStructuralWireGeometry(wire as StructuralWireElements, box, node),
        },
      ],
    });
    engineRef.current = engine;
    registerWireEngine(engine);

    const pane = document.querySelector(".graph-pane");
    const onScroll = (): void => {
      engine.tickOnce();
    };
    pane?.addEventListener("scroll", onScroll, true);

    return () => {
      pane?.removeEventListener("scroll", onScroll, true);
      engine.dispose();
      engineRef.current = null;
      registerWireEngine(null);
    };
  }, [getNode]);

  useLayoutEffect(() => {
    specsRef.current = previewEdges;
    const svg = svgRef.current;
    if (!svg || previewEdges.length === 0) {
      for (const wire of wiresRef.current.values()) wire.group.remove();
      wiresRef.current.clear();
      prevEdgeCountRef.current = 0;
    } else {
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
    }
    engineRef.current?.tickOnce();
  }, [previewEdges, isWarm]);

  useLayoutEffect(() => {
    structuralSpecsRef.current = allStructuralSpecs;
    const svg = svgRef.current;
    if (!svg) return;

    let layer = svg.querySelector<SVGGElement>("[data-structural-wires]");
    if (!layer) {
      layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layer.setAttribute("data-structural-wires", "");
      svg.append(layer);
    }

    if (allStructuralSpecs.length === 0) {
      for (const wire of structuralWiresRef.current.values()) wire.group.remove();
      structuralWiresRef.current.clear();
    } else {
      syncStructuralWireDom(layer, allStructuralSpecs, structuralWiresRef.current);
    }
    engineRef.current?.tickOnce();
  }, [allStructuralSpecs]);

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
        <marker
          id="structural-arrow-triangle"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path
            d="M0,0 L8,4 L0,8 Z"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.2"
          />
        </marker>
        <marker
          id="structural-arrow-diamond"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,4 L4,0 L8,4 L4,8 Z" fill="context-stroke" />
        </marker>
        <marker
          id="structural-arrow-open"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path
            d="M0,0 L6,3 L0,6"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1"
          />
        </marker>
      </defs>
    </svg>
  );
}
