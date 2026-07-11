import { PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/context/SimulationContext";

export function SimulationPreflight() {
  const {
    preflightOpen,
    preflightInputs,
    setPreflightInput,
    confirmPreflight,
    cancelPreflight,
    startAnchor,
  } = useSimulation();

  if (!preflightOpen || !startAnchor) return null;

  const names = Object.keys(preflightInputs);

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-background/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
        <h3 className="text-sm font-semibold">Simulation inputs</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {startAnchor.methodName} — line {startAnchor.startLine}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {names.length === 0 ? (
            <p className="text-xs text-muted-foreground">No parameters in scope.</p>
          ) : (
            names.map((name) => (
              <label key={name} className="flex flex-col gap-0.5 text-xs">
                <span className="font-medium">{name}</span>
                <input
                  className="rounded border border-input bg-background px-2 py-1 font-mono text-sm"
                  value={preflightInputs[name] ?? ""}
                  onChange={(e) => setPreflightInput(name, e.target.value)}
                  placeholder="initial value"
                />
              </label>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancelPreflight}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={confirmPreflight}>
            Start
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SimulationPanel() {
  const { simActive, panelOpen, setPanelOpen, session, currentScope } = useSimulation();

  if (!panelOpen) return null;

  const step = session?.steps[session.currentIndex];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Simulation</h3>
          <p className="truncate text-xs text-muted-foreground">
            {session?.methodName ?? "Not running"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setPanelOpen(false)}
          aria-label="Collapse simulation panel"
          title="Collapse panel"
        >
          <PanelRightClose />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {!simActive || !session ? (
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <p>Step through a method line-by-line and watch variables update.</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Expand a method body</li>
              <li>Right-click a line</li>
              <li>Choose <span className="font-medium text-foreground">Start trace here</span></li>
            </ol>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Line {step?.lineNumber ?? session.startLine}
            </p>
            {step ? (
              <pre className="mb-3 whitespace-pre-wrap rounded bg-muted px-2 py-1 font-mono text-xs">
                {step.text.trim()}
              </pre>
            ) : null}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-1 font-medium">Name</th>
                  <th className="pb-1 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {[...currentScope.entries()].map(([name, val]) => (
                  <tr key={name}>
                    <td className="py-0.5 font-mono">{name}</td>
                    <td className="py-0.5 font-mono text-muted-foreground">{val.display}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </aside>
  );
}
