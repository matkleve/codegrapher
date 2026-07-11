import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulation } from "@/context/SimulationContext";

export function SimInputsForm() {
  const {
    startAnchor,
    endAnchor,
    effectiveEndLine,
    traceRangeLabel,
    preflightInputs,
    setPreflightInput,
    applyInputs,
    saveCurrentPath,
    confirmPreflight,
    preflightOpen,
    simActive,
  } = useSimulation();

  if (!startAnchor) {
    if (endAnchor) {
      return (
        <p className="text-xs text-muted-foreground">
          End set on line {endAnchor.line}.{" "}
          <span className="font-medium text-foreground">Alt+click</span> the gutter to set a start
          point.
        </p>
      );
    }
    return (
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Alt+click</span> the gutter or right-click a
        token → <span className="font-medium text-foreground">Start trace here</span> to arm a
        trace.
      </p>
    );
  }

  const names = Object.keys(preflightInputs);
  const implicitEnd = endAnchor == null || endAnchor.memberId !== startAnchor.memberId;
  const rangeLabel =
    effectiveEndLine != null
      ? traceRangeLabel(startAnchor.startLine, effectiveEndLine, implicitEnd)
      : `L${startAnchor.startLine}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {startAnchor.methodName} — {rangeLabel}
      </p>
      <div className="flex flex-col gap-2">
        {names.length === 0 ? (
          <p className="text-xs text-muted-foreground">No parameters in scope.</p>
        ) : (
          names.map((name) => (
            <label key={name} className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium">{name}</span>
              <Input
                className="font-mono"
                value={preflightInputs[name] ?? ""}
                onChange={(e) => setPreflightInput(name, e.target.value)}
                placeholder="initial value"
              />
            </label>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={applyInputs}>
          Apply
        </Button>
        {!simActive ? (
          <Button type="button" size="sm" onClick={confirmPreflight}>
            Start run
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={() => saveCurrentPath()}>
          Save path
        </Button>
      </div>
      {preflightOpen ? (
        <p className="text-2xs text-muted-foreground">
          Preflight open — confirm Start in the dialog or use Start run here.
        </p>
      ) : null}
    </div>
  );
}
