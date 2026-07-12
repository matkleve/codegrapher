export type ExplorerErrorPhase = "index" | "tree" | "browse" | "open";

export type ExplorerErrorContext = {
  folderPath?: string;
  phase?: ExplorerErrorPhase;
};

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

/** Turn API / server failures into concrete, actionable copy for the explorer. */
export function formatExplorerError(
  err: unknown,
  context: ExplorerErrorContext = {},
): string {
  const raw = messageOf(err).trim();
  const path = context.folderPath?.trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("api server is not running") ||
    lower.includes("can't reach the api server") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror")
  ) {
    return [
      "Can't reach the API server (port 3001).",
      "In a terminal, cd to the codegrapher folder and run npm run dev, then click Open again.",
    ].join("\n");
  }

  if (
    lower.includes("path must be an existing directory") ||
    lower.includes("path does not exist") ||
    lower.includes("folder not found")
  ) {
    const target = path ? ` at ${path}` : "";
    return [
      `Folder not found${target}.`,
      "Use an absolute path that exists (e.g. /home/you/Projects/my-app), or click the folder icon to browse.",
    ].join("\n");
  }

  if (lower.includes("path must be a directory")) {
    return [
      "That path points to a file, not a folder.",
      "Choose the project root directory that contains your .ts / .tsx files.",
    ].join("\n");
  }

  if (context.phase === "browse" || lower.includes("folder picker")) {
    return [
      "Folder picker isn't available on this system.",
      "Install zenity (sudo apt install zenity) or paste an absolute path into the field above.",
    ].join("\n");
  }

  if (raw === "Enter an absolute folder path or browse") {
    return [
      "No folder path entered.",
      "Paste an absolute path like /home/you/Projects/my-app, or click the folder icon to browse.",
    ].join("\n");
  }

  if (context.phase === "index" || raw === "Failed to index project") {
    const target = path ? ` ${path}` : " this folder";
    return [
      `Couldn't index${target}.`,
      "Check the folder exists, is readable, and contains TypeScript files. If it keeps failing, restart with npm run dev.",
    ].join("\n");
  }

  if (context.phase === "tree" || lower.includes("failed to load folder")) {
    const target = path ? ` for ${path}` : "";
    return [
      `Couldn't read the file tree${target}.`,
      "Check folder permissions and that the path is still mounted, then try Open again.",
    ].join("\n");
  }

  if (lower.includes("index build failed")) {
    const target = path ? ` (${path})` : "";
    return [
      `Indexing failed${target}.`,
      "The project may contain files the parser can't read. Try a smaller subfolder or restart with npm run dev.",
    ].join("\n");
  }

  if (raw.length > 120) return raw;

  return [raw, "If this persists, restart with npm run dev and try again."].join("\n");
}
