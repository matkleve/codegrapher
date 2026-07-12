import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimulationPanelToggle } from "@/components/simulation/SimulationPanelToggle";

const GRAPH_SUBTITLE =
  "Click a file to start a new graph, or drag a file onto the graph to add it.";

type GraphToolbarProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  onLastGraph: () => void;
  onNextGraph: () => void;
  loading?: boolean;
};

export function GraphToolbar({
  canGoBack,
  canGoForward,
  onLastGraph,
  onNextGraph,
  loading,
}: GraphToolbarProps) {
  return (
    <div className="pointer-events-auto relative z-30 flex items-center gap-3 border-b border-border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]"
          />
          Graph
        </h2>
        <p className="text-xs text-muted-foreground">{GRAPH_SUBTITLE}</p>
      </div>
      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canGoBack}
          onClick={onLastGraph}
          title="Last graph"
          aria-label="Last graph"
        >
          <ChevronLeft data-icon="inline-start" />
          Last graph
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canGoForward}
          onClick={onNextGraph}
          title="Next graph"
          aria-label="Next graph"
        >
          Next graph
          <ChevronRight data-icon="inline-end" />
        </Button>
        <SimulationPanelToggle />
      </div>
      {loading && (
        <span className="shrink-0 text-sm text-muted-foreground">Loading…</span>
      )}
    </div>
  );
}
