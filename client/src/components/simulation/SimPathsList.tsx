import { Copy, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/context/SimulationContext";

export function SimPathsList() {
  const {
    savedPaths,
    startAnchor,
    runSavedPath,
    removeSavedPath,
    duplicateSavedPath,
    saveCurrentPath,
    loadPathDraft,
    endAnchor,
    effectiveEndLine,
    traceRangeLabel,
  } = useSimulation();

  const canSave = Boolean(startAnchor);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Saved trace setups</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canSave}
          onClick={() => saveCurrentPath()}
        >
          Save current
        </Button>
      </div>
      {canSave && effectiveEndLine != null ? (
        <p className="text-2xs text-muted-foreground">
          Current:{" "}
          {traceRangeLabel(
            startAnchor!.startLine,
            effectiveEndLine,
            endAnchor == null || endAnchor.memberId !== startAnchor!.memberId,
          )}
        </p>
      ) : null}
      {savedPaths.length === 0 ? (
        <p className="text-xs text-muted-foreground">No saved paths yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {savedPaths.map((path) => (
            <li
              key={path.id}
              className="rounded border border-border bg-muted/30 px-2 py-1.5"
            >
              <p className="truncate text-xs font-medium">{path.label}</p>
              <p className="truncate text-2xs text-muted-foreground">
                {path.methodName}
                {path.endLine != null && path.endLine !== path.startLine
                  ? ` · L${path.startLine}→L${path.endLine}`
                  : ` · L${path.startLine}`}
              </p>
              <p className="truncate font-mono text-2xs text-muted-foreground">
                {Object.entries(path.inputs)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(", ") || "no inputs"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => runSavedPath(path)}
                  aria-label={`Run ${path.label}`}
                >
                  <Play className="size-3" />
                  Run
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => loadPathDraft(path)}
                  aria-label={`Edit inputs for ${path.label}`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => duplicateSavedPath(path.id)}
                  aria-label={`Duplicate ${path.label}`}
                >
                  <Copy className="size-3" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => removeSavedPath(path.id)}
                  aria-label={`Delete ${path.label}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
