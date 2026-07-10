import { useLayoutEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { resolvePreviewAnchor } from "@/lib/resolvePreviewAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

const PILL_OFFSET_PX = 52;

function positionPill(
  btn: HTMLButtonElement,
  spec: PreviewEdgeSpec,
  svgBox: DOMRect,
  getNode: (id: string) => ReturnType<ReturnType<typeof useReactFlow>["getNode"]>,
): boolean {
  const { to } = refinePreviewEdge(spec, getNode);
  const toPt = resolvePreviewAnchor(to, svgBox, "to");
  if (!toPt) {
    btn.style.display = "none";
    return false;
  }
  const flip = toPt.x - PILL_OFFSET_PX < 8;
  const x = flip ? toPt.x + PILL_OFFSET_PX : toPt.x - PILL_OFFSET_PX;
  btn.style.display = "";
  btn.style.left = `${x}px`;
  btn.style.top = `${toPt.y}px`;
  btn.classList.toggle("load-connector-pill-flip", flip);
  return true;
}

export function LoadConnector() {
  const { previewEdges, onLoadFile } = useGraphInteraction();
  const { getNode } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
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
        const btn = buttonsRef.current.get(spec.id);
        if (btn) positionPill(btn, spec, svgBox, getNode);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [getNode, loadEdgeKey]);

  const handleLoad = (spec: PreviewEdgeSpec) => {
    const path = spec.load?.filePath;
    if (path) void onLoadFile(path);
  };

  if (!loadEdgeKey) {
    return (
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-[48]"
        aria-hidden
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[48] overflow-visible"
      aria-hidden
    >
      {loadSpecs.map((spec) => {
        const stroke = TOKEN_EDGE_STROKE[spec.kind];
        const count = spec.load?.occurrenceCount ?? 1;
        return (
          <button
            key={spec.id}
            ref={(el) => {
              if (el) buttonsRef.current.set(spec.id, el);
              else buttonsRef.current.delete(spec.id);
            }}
            type="button"
            className={cn(
              "load-connector-pill pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2",
            )}
            style={{ borderColor: stroke, color: stroke }}
            title={`Load definition (${count} definition${count === 1 ? "" : "s"} in repo)`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLoad(spec);
            }}
          >
            Load{count > 1 ? ` · ${count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
