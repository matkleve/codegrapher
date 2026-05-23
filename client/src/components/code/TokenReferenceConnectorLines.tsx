import { useLayoutEffect, useState } from "react";
import type { AnchorRect } from "@/context/GraphInteractionContext";

type TokenReferenceConnectorLinesProps = {
  anchor: AnchorRect;
  cardKeys: string[];
  getCardElement: (key: string) => HTMLElement | null;
};

function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  const cy = y1 + Math.max(12, (y2 - y1) * 0.35);
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function TokenReferenceConnectorLines({
  anchor,
  cardKeys,
  getCardElement,
}: TokenReferenceConnectorLinesProps) {
  const [paths, setPaths] = useState<string[]>([]);

  useLayoutEffect(() => {
    const update = () => {
      const x1 = anchor.left + anchor.width / 2;
      const y1 = anchor.bottom;
      const next: string[] = [];

      for (const key of cardKeys) {
        const el = getCardElement(key);
        if (!el) continue;
        const indicator = el.querySelector("[data-card-indicator]");
        const target = indicator ?? el;
        const rect = target.getBoundingClientRect();
        const x2 = rect.left;
        const y2 = rect.top + rect.height / 2;
        next.push(curvePath(x1, y1, x2, y2));
      }

      setPaths(next);
    };

    update();
    const id = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor, cardKeys, getCardElement]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[49]"
      aria-hidden
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgb(251 146 60)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className="token-ref-connector-path"
        />
      ))}
    </svg>
  );
}
