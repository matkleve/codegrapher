import type { TraceLitState } from "@/lib/computeTraceLit";

function sorted(entries: Iterable<string>): string[] {
  return [...entries].sort();
}

function mapEntries(m: ReadonlyMap<string, number>): string[] {
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`);
}

function portEntries(
  m: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): string[] {
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, sides]) => `${k}:${[...sides].sort().join("")}`);
}

/** Stable string for skipping redundant DOM apply when lit state is unchanged. */
export function traceLitFingerprint(state: TraceLitState): string {
  return [
    sorted(state.litTokenKeys).join(","),
    sorted(state.endpointTokenKeys).join(","),
    sorted(state.siblingEndpointTokenKeys).join(","),
    mapEntries(state.traceDepth).join(","),
    mapEntries(state.litLineDepth).join(","),
    portEntries(state.endpointPortSide).join(","),
    sorted(state.litMemberIds).join(","),
    sorted(state.ownerLitMemberIds).join(","),
  ].join("|");
}
