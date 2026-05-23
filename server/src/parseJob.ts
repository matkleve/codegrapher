import { parseDirectory, type ParseResult } from "./parser";

export const MAX_NODES = 500;
export const PARSE_TIMEOUT_MS = 30_000;

export type ParsePhase =
  | "idle"
  | "scanning"
  | "parsing"
  | "building"
  | "done"
  | "error";

export interface ParseStatus {
  phase: ParsePhase;
  message: string;
  nodeCount: number;
  busy: boolean;
  result?: ParseResult;
  error?: string;
  truncated?: boolean;
}

const idleStatus = (): ParseStatus => ({
  phase: "idle",
  message: "",
  nodeCount: 0,
  busy: false,
});

let status: ParseStatus = idleStatus();
let parseTimeout: ReturnType<typeof setTimeout> | null = null;

export function getParseStatus(): ParseStatus {
  return status;
}

export function startParse(dirPath: string): { ok: true } | { ok: false; error: string } {
  if (status.busy) {
    return { ok: false, error: "Parse already in progress" };
  }

  status = {
    phase: "scanning",
    message: "Parsing files...",
    nodeCount: 0,
    busy: true,
  };

  if (parseTimeout) {
    clearTimeout(parseTimeout);
  }

  parseTimeout = setTimeout(() => {
    if (!status.busy) return;
    status = {
      phase: "error",
      message: "Parse timed out",
      nodeCount: status.nodeCount,
      busy: false,
      error: "Parse timed out after 30 seconds",
    };
  }, PARSE_TIMEOUT_MS);

  setImmediate(() => {
    try {
      const result = parseDirectory(dirPath, {
        maxNodes: MAX_NODES,
        shouldContinue: () => status.busy,
        onProgress: (update) => {
          if (!status.busy) return;
          status = { ...status, ...update, busy: true };
        },
      });

      if (!status.busy) return;

      status = {
        phase: "done",
        message: `Building graph (${result.nodes.length} nodes)...`,
        nodeCount: result.nodes.length,
        busy: false,
        result,
        truncated: result.truncated,
      };
    } catch (err) {
      if (!status.busy && status.phase === "error") return;
      const message = err instanceof Error ? err.message : "Parse failed";
      status = {
        phase: "error",
        message,
        nodeCount: status.nodeCount,
        busy: false,
        error: message,
      };
    } finally {
      if (parseTimeout) {
        clearTimeout(parseTimeout);
        parseTimeout = null;
      }
    }
  });

  return { ok: true };
}
