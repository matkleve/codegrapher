import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { TokenInfoState } from "@/lib/tokenContextInfo";

export type PinnedTrace = {
  tokenKey: string;
  edges: PreviewEdgeSpec[];
  info: NonNullable<TokenInfoState> | null;
};

export function mergePinnedEdges(traces: PinnedTrace[]): PreviewEdgeSpec[] {
  return traces.flatMap((t) => t.edges);
}

export function pinnedKeys(traces: PinnedTrace[]): string[] {
  return traces.map((t) => t.tokenKey);
}

export type PinMode = "replace" | "accumulate" | "toggle";

export function applyPinGesture(
  traces: PinnedTrace[],
  tokenKey: string,
  mode: PinMode,
): { traces: PinnedTrace[]; activeKey: string | null } {
  if (mode === "replace") {
    return {
      traces: [{ tokenKey, edges: [], info: null }],
      activeKey: tokenKey,
    };
  }

  const existing = traces.findIndex((t) => t.tokenKey === tokenKey);
  if (mode === "toggle" && existing >= 0) {
    const next = traces.filter((_, i) => i !== existing);
    return {
      traces: next,
      activeKey: next[next.length - 1]?.tokenKey ?? null,
    };
  }

  if (existing >= 0) {
    return { traces, activeKey: tokenKey };
  }

  return {
    traces: [...traces, { tokenKey, edges: [], info: null }],
    activeKey: tokenKey,
  };
}

export function updatePinnedEdges(
  traces: PinnedTrace[],
  tokenKey: string,
  edges: PreviewEdgeSpec[],
): PinnedTrace[] {
  return traces.map((t) =>
    t.tokenKey === tokenKey ? { ...t, edges } : t,
  );
}

export function updatePinnedInfo(
  traces: PinnedTrace[],
  tokenKey: string,
  info: NonNullable<TokenInfoState>,
): PinnedTrace[] {
  return traces.map((t) =>
    t.tokenKey === tokenKey ? { ...t, info } : t,
  );
}

export function setActivePin(
  traces: PinnedTrace[],
  tokenKey: string,
): PinnedTrace[] {
  if (!traces.some((t) => t.tokenKey === tokenKey)) return traces;
  const active = traces.find((t) => t.tokenKey === tokenKey)!;
  const rest = traces.filter((t) => t.tokenKey !== tokenKey);
  return [...rest, active];
}
