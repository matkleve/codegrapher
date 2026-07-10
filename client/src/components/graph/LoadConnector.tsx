import { useLayoutEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { ConnectorChip } from "@/components/code/ConnectorChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { collectGraphFilePaths, isFileInGraph } from "@/lib/graphFiles";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { resolvePreviewAnchor } from "@/lib/resolvePreviewAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

const LOAD_STUB_OFFSET_PX = 72;

function loadSocketSide(flip: boolean): "left" | "right" {
  return flip ? "left" : "right";
}

function positionChip(
  chip: HTMLElement,
  spec: PreviewEdgeSpec,
  svgBox: DOMRect,
  getNode: (id: string) => ReturnType<ReturnType<typeof useReactFlow>["getNode"]>,
): boolean {
  const { to } = refinePreviewEdge(spec, getNode);
  const toPt = resolvePreviewAnchor(to, svgBox, "to");
  if (!toPt) {
    chip.style.display = "none";
    return false;
  }
  const flip = toPt.x - LOAD_STUB_OFFSET_PX < 8;
  const x = flip ? toPt.x + LOAD_STUB_OFFSET_PX : toPt.x - LOAD_STUB_OFFSET_PX;
  chip.dataset.loadSocket = loadSocketSide(flip);
  chip.style.display = "";
  chip.style.left = `${x}px`;
  chip.style.top = `${toPt.y}px`;
  return true;
}

type LoadChipProps = {
  spec: PreviewEdgeSpec;
  onLoad: (spec: PreviewEdgeSpec) => void;
  onEnter: () => void;
  chipRef: (el: HTMLSpanElement | null) => void;
};

function LoadChip({ spec, onLoad, onEnter, chipRef }: LoadChipProps) {
  const count = spec.load?.occurrenceCount ?? 1;
  const label = count > 1 ? `Load · ${count} files` : "Load";

  return (
    <ConnectorChip
      ref={chipRef}
      variant="load"
      kind={spec.kind}
      label={label}
      showLeftSocket
      showRightSocket
      role="button"
      tabIndex={0}
      data-load-edge-id={spec.id}
      data-load-socket="right"
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
      title={`Load definition (${count} definition${count === 1 ? "" : "s"} in repo)`}
      onMouseEnter={onEnter}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onLoad(spec);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onLoad(spec);
        }
      }}
    />
  );
}

export function LoadConnector() {
  const {
    previewEdges,
    onLoadFile,
    graphData,
    refreshLoadTraces,
    cancelHoverLeaveGrace,
  } = useGraphInteraction();
  const { getNode } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const specsRef = useRef<PreviewEdgeSpec[]>([]);

  const loadSpecs = previewEdges.filter((e) => e.load);
  const loadEdgeKey = loadSpecs.map((e) => e.id).join(",");

  useLayoutEffect(() => {
    specsRef.current = loadSpecs;
  }, [loadSpecs]);

  useLayoutEffect(() => {
    if (!loadEdgeKey) return;

    let raf = 0;
    const tick = () => {
      const container = containerRef.current;
      if (!container) return;
      const box = container.getBoundingClientRect();
      const svgBox = new DOMRect(box.left, box.top, box.width, box.height);
      for (const spec of specsRef.current) {
        const chip = chipsRef.current.get(spec.id);
        if (chip) positionChip(chip, spec, svgBox, getNode);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [getNode, loadEdgeKey]);

  const handleLoad = (spec: PreviewEdgeSpec) => {
    cancelHoverLeaveGrace();
    const path = spec.load?.filePath;
    if (!path) return;
    const graphPaths = collectGraphFilePaths(graphData);
    if (isFileInGraph(path, graphPaths)) {
      refreshLoadTraces();
      return;
    }
    void onLoadFile(path);
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[48] overflow-visible"
      aria-hidden={!loadEdgeKey}
    >
      {loadSpecs.map((spec) => (
        <LoadChip
          key={spec.id}
          spec={spec}
          onLoad={handleLoad}
          onEnter={cancelHoverLeaveGrace}
          chipRef={(el) => {
            if (el) chipsRef.current.set(spec.id, el);
            else chipsRef.current.delete(spec.id);
          }}
        />
      ))}
    </div>
  );
}
