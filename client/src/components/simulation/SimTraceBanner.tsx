import { Button } from "@/components/ui/button";
import { useSimulation } from "@/context/SimulationContext";

export function SimTraceBanner() {
  const {
    simActive,
    startAnchor,
    endAnchor,
    session,
    effectiveEndLine,
    traceRangeLabel,
    disarmTrace,
    exitSimulation,
    stopAndClear,
  } = useSimulation();

  if (!startAnchor && !simActive) return null;

  const methodName = session?.methodName ?? startAnchor?.methodName ?? "Trace";
  const startLine = session?.startLine ?? startAnchor?.startLine;
  const endLine = session?.endLine ?? effectiveEndLine;
  const implicitEnd =
    !simActive &&
    Boolean(startAnchor) &&
    (endAnchor == null || endAnchor.memberId !== startAnchor?.memberId);

  if (startLine == null || endLine == null) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{methodName}</p>
        <p className="truncate text-2xs text-muted-foreground">
          Trace: {traceRangeLabel(startLine, endLine, implicitEnd)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        {simActive ? (
          <>
            <Button type="button" size="xs" variant="secondary" onClick={exitSimulation}>
              Exit run
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={stopAndClear}>
              Stop and clear
            </Button>
          </>
        ) : (
          <Button type="button" size="xs" variant="ghost" onClick={disarmTrace}>
            Clear setup
          </Button>
        )}
      </div>
    </div>
  );
}
