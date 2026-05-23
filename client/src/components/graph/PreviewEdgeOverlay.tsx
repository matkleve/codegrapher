import { useLayoutEffect, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
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

function findTargetAnchor(handleId: string): HTMLElement | null {
  return document.querySelector(
    `[data-flow-anchor-target="${handleId}"][data-flow-anchor="left"]`,
  );
}

export function PreviewEdgeOverlay() {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const { previewEdge } = useGraphInteraction();
  const transform = useStore((s) => s.transform);
  const [path, setPath] = useState<string | null>(null);
  const [stroke, setStroke] = useState("#60a5fa");

  useLayoutEffect(() => {
    if (!previewEdge) {
      setPath(null);
      return;
    }

    const update = () => {
      const sourceEl = previewEdge.sourceRightAnchor;
      const targetEl = findTargetAnchor(previewEdge.targetHandle);
      if (!sourceEl || !targetEl) {
        setPath(null);
        return;
      }

      const srcRect = sourceEl.getBoundingClientRect();
      const tgtRect = targetEl.getBoundingClientRect();

      const sourceFlow = screenToFlowPosition({
        x: srcRect.left,
        y: srcRect.top + srcRect.height / 2,
      });
      const targetFlow = screenToFlowPosition({
        x: tgtRect.left,
        y: tgtRect.top + tgtRect.height / 2,
      });

      const s = flowToScreenPosition(sourceFlow);
      const t = flowToScreenPosition(targetFlow);

      setStroke(TOKEN_EDGE_STROKE[previewEdge.kind]);
      setPath(cubicPath(s.x, s.y, t.x, t.y));
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [flowToScreenPosition, previewEdge, screenToFlowPosition, transform]);

  if (!path) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-40 overflow-visible"
      aria-hidden
    >
      <defs>
        <marker
          id="preview-edge-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill={stroke} />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray="5 3"
        markerEnd="url(#preview-edge-arrow)"
        className="preview-edge-path"
      />
    </svg>
  );
}
