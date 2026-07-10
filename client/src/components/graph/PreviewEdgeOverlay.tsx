import { useLayoutEffect, useRef, useState } from "react";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";

function cubicPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dx = x2 - x1;
  const c1x = x1 + dx * 0.45;
  const c2x = x2 - dx * 0.45;
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
}

function findTargetAnchor(
  handleId: string,
  side: "left" | "right",
): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      `[data-flow-anchor-target="${handleId}"][data-flow-anchor="${side}"]`,
    ) ??
    document.querySelector<HTMLElement>(
      `[data-flow-anchor-target="${handleId}"]`,
    )
  );
}

export function PreviewEdgeOverlay() {
  const { previewEdge } = useGraphInteraction();
  const svgRef = useRef<SVGSVGElement>(null);
  const [path, setPath] = useState<string | null>(null);
  const [stroke, setStroke] = useState("var(--token-edge-function)");

  useLayoutEffect(() => {
    if (!previewEdge) {
      setPath(null);
      return;
    }

    const update = () => {
      const svgEl = svgRef.current;
      const sourceEl = previewEdge.sourceRightAnchor;
      // The line leaves the token chip on whichever side faces the target,
      // and enters the target through the semicircle anchor on the facing side.
      const chipEl = sourceEl?.parentElement ?? sourceEl;
      const probe = findTargetAnchor(previewEdge.targetHandle, "left");
      if (!svgEl || !chipEl?.isConnected || !probe?.isConnected) {
        setPath(null);
        return;
      }

      const srcRect = chipEl.getBoundingClientRect();
      const targetLeftOfSource =
        probe.getBoundingClientRect().left + probe.getBoundingClientRect().width / 2 <
        srcRect.left + srcRect.width / 2;

      const targetEl = findTargetAnchor(
        previewEdge.targetHandle,
        targetLeftOfSource ? "right" : "left",
      );
      if (!targetEl?.isConnected) {
        setPath(null);
        return;
      }

      // Path coordinates are local to the overlay svg, so subtract its
      // viewport origin from the anchors' client rects.
      const box = svgEl.getBoundingClientRect();
      const tgtRect = targetEl.getBoundingClientRect();
      const targetSide = targetEl.getAttribute("data-flow-anchor");

      setStroke(TOKEN_EDGE_STROKE[previewEdge.kind]);
      setPath(
        cubicPath(
          (targetLeftOfSource ? srcRect.left : srcRect.right) - box.left,
          srcRect.top + srcRect.height / 2 - box.top,
          (targetSide === "right" ? tgtRect.right : tgtRect.left) - box.left,
          tgtRect.top + tgtRect.height / 2 - box.top,
        ),
      );
    };

    // Re-measure every frame while the preview is active: panning, zooming,
    // and expanding or collapsing members all shift the anchors.
    let raf = 0;
    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [previewEdge]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-40 overflow-visible"
      aria-hidden
    >
      {path && (
        <>
          <defs>
            <marker
              id="preview-edge-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" style={{ fill: stroke }} />
            </marker>
          </defs>
          <path
            d={path}
            fill="none"
            style={{ stroke }}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            markerEnd="url(#preview-edge-arrow)"
            className="preview-edge-path"
          />
        </>
      )}
    </svg>
  );
}
