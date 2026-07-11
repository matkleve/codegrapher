import { useEffect, useRef } from "react";
import type { SimStep } from "@/lib/staticWalk/types";
import { simTickMetrics } from "@/lib/simStepSummary";
import { cn } from "@/lib/utils";

type SimStepTickStripProps = {
  steps: SimStep[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

export function SimStepTickStrip({ steps, currentIndex, onSelect }: SimStepTickStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const { sizePx, gapPx } = simTickMetrics(steps.length);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentIndex]);

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Simulation steps"
      className="sim-tick-strip nodrag max-w-[min(280px,42vw)] overflow-x-auto"
      style={{ gap: gapPx }}
    >
      {steps.map((step, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isCall = step.kind === "call";

        return (
          <button
            key={`${step.lineNumber}-${index}`}
            ref={isCurrent ? currentRef : undefined}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-label={`Step ${index + 1}, line ${step.lineNumber}`}
            title={`${index + 1}. L${step.lineNumber} ${step.kind}`}
            className={cn(
              "sim-tick shrink-0 nodrag",
              isCall && "sim-tick--call",
              isPast && "sim-tick--past",
              isCurrent && "sim-tick--current",
              !isPast && !isCurrent && "sim-tick--future",
              step.crossesClass && "sim-tick--cross-class",
            )}
            style={{ width: sizePx, height: sizePx }}
            onClick={() => onSelect(index)}
          />
        );
      })}
    </div>
  );
}
