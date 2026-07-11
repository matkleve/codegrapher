import { useEffect, useRef } from "react";
import { useSimulation } from "@/context/SimulationContext";
import { SimStepLedgerRow } from "@/components/simulation/SimStepLedgerRow";

export function SimStepLedger() {
  const {
    session,
    ledgerExpanded,
    toggleLedgerRow,
    scrubTo,
  } = useSimulation();
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [session?.currentIndex]);

  if (!session) {
    return (
      <p className="text-xs text-muted-foreground">
        Arm a trace with gutter markers or right-click a line, then start a run.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {session.steps.map((step, index) => (
        <div
          key={`${step.lineNumber}-${index}`}
          ref={index === session.currentIndex ? currentRef : undefined}
        >
          <SimStepLedgerRow
            index={index}
            step={step}
            current={index === session.currentIndex}
            expanded={ledgerExpanded.has(index)}
            onToggle={() => toggleLedgerRow(index)}
            onSelect={() => scrubTo(index)}
          />
        </div>
      ))}
    </div>
  );
}
