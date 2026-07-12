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
    hasExplicitTraceEnd,
  } = useSimulation();

  if (!startAnchor) {
    if (endAnchor) {
      return (
        <p className="text-xs text-muted-foreground">
          Stop set on line {endAnchor.line}. Use the line gutter to set a{" "}
          <span className="font-medium text-foreground">start</span> point.
        </p>
      );
    }
    return (
      <p className="text-xs text-muted-foreground">
        Use the line gutter to set a <span className="font-medium text-foreground">start</span>{" "}
        point, or right-click a token → <span className="font-medium text-foreground">Start trace here</span>.
      </p>
    );
  }

  if (!hasExplicitTraceEnd) {
    return (
      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>
          Start set on line {startAnchor.startLine} ({startAnchor.methodName}). Use the line gutter
          to set a <span className="font-medium text-foreground">stop</span> point.
        </p>
        <p className="text-2xs">
          Hover the gutter action for a moment to pick start, stop, or pause on any line.
        </p>
      </div>
    );
  }

  const names = Object.keys(preflightInputs);
  const rangeLabel =
    effectiveEndLine != null
      ? traceRangeLabel(startAnchor.startLine, effectiveEndLine, false)
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
