/** Server-emitted indexing phases — counts are honest; no fake percentages. */
export type IndexProgressEvent =
  | { phase: "loading" }
  | { phase: "preparing"; total: number }
  | { phase: "files"; done: number; total: number; currentFile?: string }
  | { phase: "references"; filesTotal: number };

export type IndexProgressStatus = IndexProgressEvent | { phase: "idle" };

export const IDLE_INDEX_PROGRESS: IndexProgressStatus = { phase: "idle" };

/** Fill width for the Open button — null = no fill yet (unknown or non-index work). */
export function indexProgressFill(status: IndexProgressStatus): number | null {
  if (status.phase === "files" && status.total > 0) {
    return Math.min(1, status.done / status.total);
  }
  if (status.phase === "references") {
    return 1;
  }
  if (status.phase === "preparing" && status.total > 0) {
    return 0;
  }
  return null;
}

export function indexProgressLabel(status: IndexProgressStatus): string {
  switch (status.phase) {
    case "loading":
      return "Scanning project…";
    case "preparing":
      return `0 / ${status.total} files`;
    case "files":
      if (status.total === 0) return "Scanning project…";
      return `${status.done} / ${status.total} files`;
    case "references":
      return status.filesTotal > 0
        ? `${status.filesTotal} / ${status.filesTotal} files`
        : "Building references…";
    default:
      return "Load folder";
  }
}

/** Secondary line under the button — what step is running right now. */
export function indexProgressSubtitle(status: IndexProgressStatus): string | null {
  switch (status.phase) {
    case "loading":
      return "Discovering TypeScript files…";
    case "preparing":
      return "Preparing TypeScript compiler…";
    case "files":
      if (status.total === 0) return "Discovering TypeScript files…";
      if (status.currentFile) return `Indexing ${status.currentFile}`;
      if (status.done >= status.total && status.total > 0) {
        return "Symbol index complete";
      }
      return `Found ${status.total} files`;
    case "references":
      return "Cross-file symbol references…";
    default:
      return null;
  }
}

/** @deprecated Use indexProgressSubtitle */
export function indexProgressDetail(status: IndexProgressStatus): string | null {
  return indexProgressSubtitle(status);
}
