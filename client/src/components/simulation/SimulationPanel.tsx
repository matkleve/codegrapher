import { PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinTab } from "@/components/ui/PinTab";
import { SimInputsForm } from "@/components/simulation/SimInputsForm";
import { SimPathsList } from "@/components/simulation/SimPathsList";
import { SimStepLedger } from "@/components/simulation/SimStepLedger";
import { SimTraceBanner } from "@/components/simulation/SimTraceBanner";
import { useSimulation } from "@/context/SimulationContext";
import type { SimPanelTab } from "@/lib/staticWalk/types";
import { useResizableSimPanel } from "@/hooks/useResizableSimPanel";
import { cn } from "@/lib/utils";

const TABS: { id: SimPanelTab; label: string }[] = [
  { id: "run", label: "Run" },
  { id: "inputs", label: "Inputs" },
  { id: "paths", label: "Paths" },
];

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

function SimPanelTabBody({ tab }: { tab: SimPanelTab }) {
  const { simActive, session, currentScope } = useSimulation();

  if (tab === "inputs") return <SimInputsForm />;
  if (tab === "paths") return <SimPathsList />;
  if (!simActive || !session) {
    return (
      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>Step through a method line-by-line and inspect each statement.</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Expand a method body</li>
          <li>
            <span className="font-medium text-foreground">Alt+click</span> gutter ▶ start ·{" "}
            <span className="font-medium text-foreground">click</span> ■ stop ·{" "}
            <span className="font-medium text-foreground">Shift+click</span> run
          </li>
          <li>Or right-click a token → Start trace / Set end / Run</li>
          <li>Set inputs and start a run</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <p className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          At step
        </p>
        <table className="w-full text-2xs">
          <tbody>
            {[...currentScope.entries()].slice(0, 6).map(([name, val]) => (
              <tr key={name}>
                <td className="py-0.5 font-mono">{name}</td>
                <td className="py-0.5 font-mono text-muted-foreground">{val.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SimStepLedger />
    </div>
  );
}

export function SimulationPanel() {
  const { panelOpen, setPanelOpen, startAnchor, session, panelTab, setPanelTab } =
    useSimulation();
  const { width, isResizing, collapseWarning, onResizeMouseDown, onResizeDoubleClick } =
    useResizableSimPanel(() => setPanelOpen(false));

  if (!panelOpen) return null;

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        !isResizing && "transition-[width] duration-200 ease-out",
        collapseWarning && "sim-panel-collapse-warning",
        isResizing && "sim-panel-resizing",
      )}
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Simulation panel width"
        className={cn(
          "sim-panel-resize-handle",
          isResizing && "sim-panel-resize-handle--active",
        )}
        onMouseDown={onResizeMouseDown}
        onDoubleClick={onResizeDoubleClick}
      />
      {collapseWarning ? (
        <div className="sim-panel-collapse-warning__overlay" aria-hidden>
          <PanelRightClose className="size-5 shrink-0" />
          <span className="sim-panel-collapse-warning__label">Release to close panel</span>
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          collapseWarning && "sim-panel-collapse-warning__content",
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Simulation</h3>
            <p className="truncate text-xs text-muted-foreground">
              {session?.methodName ?? startAnchor?.methodName ?? "No trace armed"}
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
        <SimTraceBanner />
        <div className="flex gap-1 border-b border-border px-2 py-1.5">
          {TABS.map((tab) => (
            <PinTab
              key={tab.id}
              label={tab.label}
              active={panelTab === tab.id}
              onClick={() => setPanelTab(tab.id)}
            />
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <SimPanelTabBody tab={panelTab} />
        </div>
      </div>
    </aside>
  );
}
