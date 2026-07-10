import { buildUsagePreviewEdge } from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId } from "@/lib/ctrlPreviewHandles";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { GraphData, SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

function parseUsageTraceKey(tokenKey: string): {
  sourceFlowId: string;
  memberId: string;
  lineNumber: number;
  token: string;
} | null {
  if (tokenKey.includes("::import::")) return null;
  const parts = tokenKey.split("::");
  if (parts.length < 4) return null;
  const token = parts[parts.length - 1]!;
  const lineNumber = Number(parts[parts.length - 2]);
  const memberId = parts[parts.length - 3]!;
  const sourceFlowId = parts.slice(0, parts.length - 3).join("::");
  if (!token || !memberId || !Number.isFinite(lineNumber)) return null;
  return { sourceFlowId, memberId, lineNumber, token };
}

/** After graph merge, swap load stubs for in-graph preview wires when possible. */
export function rebuildTraceEdgesForKey(
  tokenKey: string,
  existingEdges: PreviewEdgeSpec[],
  symbols: Map<string, SymbolEntry[]>,
  graphData: GraphData | null,
  getNode: (id: string) => Node | undefined,
): PreviewEdgeSpec[] | null {
  if (!existingEdges.some((e) => e.load)) return null;
  if (!graphData) return null;

  const chipEl = document.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(tokenKey)}"]`,
  );
  if (!chipEl?.isConnected) return null;

  const parsed = parseUsageTraceKey(tokenKey);
  const token = chipEl.dataset.symbolName ?? parsed?.token;
  if (!token) return null;

  const sourceFlowId = parsed?.sourceFlowId ?? "";
  const edgeId =
    existingEdges[0]?.id ??
    ctrlPreviewEdgeId(
      sourceFlowId,
      parsed ? `${parsed.memberId}::${parsed.lineNumber}::${token}` : token,
    );

  const resolved = resolveVisibleTarget(
    token,
    symbols,
    graphData,
    getNode,
    sourceFlowId,
  );
  if (!resolved || resolved.mode !== "graph") return null;

  return [buildUsagePreviewEdge(edgeId, resolved, chipEl, token)];
}
