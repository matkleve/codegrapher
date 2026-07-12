import { useLayoutEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useJumpTooltip } from "@/context/JumpTooltipContext";
import { useJumpClick } from "@/hooks/useJumpClick";
import {
  JUMP_TOOLTIP_DWELL_MS,
  JUMP_TOOLTIP_DWELL_WARM_MS,
} from "@/lib/hoverIntent";
import {
  jumpTargetForWireEnd,
  jumpTargetLabel,
  pickJumpWireEnd,
} from "@/lib/resolveJumpTarget";
import {
  createWireEngine,
  registerWireEngine,
  type WireEngine,
} from "@/lib/wireEngine";
import {
  syncWireDom,
  updateWireGeometry,
  refreshWireDepthOpacity,
  refreshOneWireDepthOpacity,
  type WireElements,
} from "@/lib/previewEdgeDom";
import { setWireHoveredEdgeId, setWireHoveredTokenKey } from "@/lib/wireHoverBoost";
import {
  syncStructuralWireDom,
  updateStructuralWireGeometry,
  type StructuralWireElements,
} from "@/lib/structuralEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";

export function usePreviewEdgeOverlay() {
  const {
    previewEdges,
    structuralEdges,
    pulseEdges,
    isWarm,
    traceTokenKey,
    hoveredTokenKey,
    cancelHoverLeaveGrace,
    scheduleHoverLeaveGrace,
  } = useGraphInteraction();
  const { setJumpTooltip, setHoveredWireId, wireJumpRef } = useJumpTooltip();
  const { getNode } = useReactFlow();
  const onWireClick = useJumpClick();
  const svgRef = useRef<SVGSVGElement>(null);
  const wiresRef = useRef<Map<string, WireElements>>(new Map());
  const structuralWiresRef = useRef<Map<string, StructuralWireElements>>(new Map());
  const specsRef = useRef<PreviewEdgeSpec[]>([]);
  const structuralSpecsRef = useRef<StructuralEdgeSpec[]>([]);
  const prevEdgeCountRef = useRef(0);
  const engineRef = useRef<WireEngine | null>(null);
  const traceTokenKeyRef = useRef(traceTokenKey);
  traceTokenKeyRef.current = traceTokenKey;

  wireJumpRef.current = (wireId, wireEnd) => {
    const spec = specsRef.current.find((s) => s.id === wireId);
    if (!spec) return;
    onWireClick(spec, wireEnd)(new MouseEvent("click"));
  };

  const bindHitHandlers = (wire: WireElements) => {
    const spec = wire.spec;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let armed = false;

    const choiceForEnd = (end: "from" | "to") => {
      const { ref, hint } = jumpTargetForWireEnd(spec, end, getNode);
      return {
        label: jumpTargetLabel(ref, hint, getNode),
        kind: spec.kind,
        wireEnd: end,
      };
    };

    const disarmWire = () => {
      armed = false;
      wire.hitMid.classList.remove("preview-edge-hit-armed");
      wire.path.classList.remove("preview-edge-line-hover");
      wire.glow.classList.remove("preview-edge-line-hover");
      setWireHoveredEdgeId(null);
      refreshOneWireDepthOpacity(wire, getNode);
    };

    const showMidTooltip = (e: MouseEvent) => {
      cancelHoverLeaveGrace();
      setHoveredWireId(spec.id);
      setWireHoveredEdgeId(spec.id);
      wire.path.classList.add("preview-edge-line-hover");
      wire.glow.classList.add("preview-edge-line-hover");
      refreshOneWireDepthOpacity(wire, getNode);

      const jumpEnd = pickJumpWireEnd(spec, traceTokenKeyRef.current, getNode);
      setJumpTooltip({
        wireId: spec.id,
        x: e.clientX,
        y: e.clientY,
        mode: "single",
        single: choiceForEnd(jumpEnd),
      });
    };

    const armWire = (e: MouseEvent) => {
      armed = true;
      wire.hitMid.classList.add("preview-edge-hit-armed");
      showMidTooltip(e);
    };

    const hideMidTooltip = () => {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
      setJumpTooltip(null);
      setHoveredWireId(null);
      disarmWire();
      scheduleHoverLeaveGrace();
    };

    wire.hitMid.onmouseenter = (e: MouseEvent) => {
      cancelHoverLeaveGrace();
      if (dwellTimer) clearTimeout(dwellTimer);
      const delay = isWarm ? JUMP_TOOLTIP_DWELL_WARM_MS : JUMP_TOOLTIP_DWELL_MS;
      dwellTimer = setTimeout(() => {
        dwellTimer = null;
        armWire(e);
      }, delay);
    };
    wire.hitMid.onmousemove = (e: MouseEvent) => {
      if (!armed) return;
      setJumpTooltip((prev) =>
        prev?.wireId === spec.id ? { ...prev, x: e.clientX, y: e.clientY } : prev,
      );
    };
    wire.hitMid.onmouseleave = hideMidTooltip;
    wire.hitMid.onclick = (e: MouseEvent) => {
      if (!armed) return;
      e.stopPropagation();
      const jumpEnd = pickJumpWireEnd(spec, traceTokenKeyRef.current, getNode);
      onWireClick(spec, jumpEnd)(e);
    };

    wire.hitFrom.onclick = null;
    wire.hitTo.onclick = null;
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
          update: (wire, box, node) => {
            const ok = updateWireGeometry(wire as WireElements, box, node, specsRef.current);
            refreshOneWireDepthOpacity(wire as WireElements, node);
            return ok;
          },
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
    setWireHoveredTokenKey(hoveredTokenKey);
    refreshWireDepthOpacity(wiresRef.current, getNode);
    engineRef.current?.tickOnce();
  }, [getNode, hoveredTokenKey]);

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
      syncWireDom(layer, previewEdges, wiresRef.current, warm, getNode);
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

  return svgRef;
}
