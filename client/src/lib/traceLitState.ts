import type { SemanticTokenKind } from "@/lib/tokenColors";

export type TraceLitState = {
  litTokenKeys: ReadonlySet<string>;
  endpointTokenKeys: ReadonlySet<string>;
  /** Provenance hop ≥ 2 endpoints — grey sibling chip + socket. */
  siblingEndpointTokenKeys: ReadonlySet<string>;
  /** Strongest (closest) graph distance per token key — mirrors wire hop decay. */
  traceDepth: ReadonlyMap<string, number>;
  /** Per-line keyword/context distance — key `${memberId}::${lineNumber}`. */
  litLineDepth: ReadonlyMap<string, number>;
  /** Wire port sides per endpoint trace key (`from` → right, `to` → left). */
  endpointPortSide: ReadonlyMap<string, ReadonlySet<"left" | "right">>;
  litMemberIds: ReadonlySet<string>;
  ownerLitMemberIds: ReadonlySet<string>;
  /** @deprecated — use litLineDepth; kept for merge compat. */
  litLineMemberIds: ReadonlySet<string>;
  litFlowNodeIds: ReadonlySet<string>;
  tokenKinds: ReadonlyMap<string, SemanticTokenKind>;
};

export const EMPTY_TRACE_LIT: TraceLitState = {
  litTokenKeys: new Set(),
  endpointTokenKeys: new Set(),
  siblingEndpointTokenKeys: new Set(),
  traceDepth: new Map(),
  litLineDepth: new Map(),
  endpointPortSide: new Map(),
  litMemberIds: new Set(),
  ownerLitMemberIds: new Set(),
  litLineMemberIds: new Set(),
  litFlowNodeIds: new Set(),
  tokenKinds: new Map(),
};

export type LitCollections = {
  litTokenKeys: Set<string>;
  endpointTokenKeys: Set<string>;
  siblingEndpointTokenKeys: Set<string>;
  traceDepth: Map<string, number>;
  litLineDepth: Map<string, number>;
  endpointPortSide: Map<string, Set<"left" | "right">>;
  litMemberIds: Set<string>;
  ownerLitMemberIds: Set<string>;
  litLineMemberIds: Set<string>;
  litFlowNodeIds: Set<string>;
  tokenKinds: Map<string, SemanticTokenKind>;
};

/** Union two trace-lit snapshots (e.g. pinned + ephemeral hover while pin is held). */
export function mergeTraceLit(a: TraceLitState, b: TraceLitState): TraceLitState {
  return {
    litTokenKeys: new Set([...a.litTokenKeys, ...b.litTokenKeys]),
    endpointTokenKeys: new Set([...a.endpointTokenKeys, ...b.endpointTokenKeys]),
    siblingEndpointTokenKeys: new Set([
      ...a.siblingEndpointTokenKeys,
      ...b.siblingEndpointTokenKeys,
    ]),
    traceDepth: mergeTraceDepth(a.traceDepth, b.traceDepth),
    litLineDepth: mergeTraceDepth(a.litLineDepth, b.litLineDepth),
    endpointPortSide: mergeEndpointPortSides(a.endpointPortSide, b.endpointPortSide),
    litMemberIds: new Set([...a.litMemberIds, ...b.litMemberIds]),
    ownerLitMemberIds: new Set([...a.ownerLitMemberIds, ...b.ownerLitMemberIds]),
    litLineMemberIds: new Set([...a.litLineMemberIds, ...b.litLineMemberIds]),
    litFlowNodeIds: new Set([...a.litFlowNodeIds, ...b.litFlowNodeIds]),
    tokenKinds: new Map([...a.tokenKinds, ...b.tokenKinds]),
  };
}

function mergeTraceDepth(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>(a);
  for (const [key, depth] of b) {
    const prev = out.get(key);
    if (prev === undefined || depth < prev) out.set(key, depth);
  }
  return out;
}

function mergeEndpointPortSides(
  a: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
  b: ReadonlyMap<string, ReadonlySet<"left" | "right">>,
): Map<string, Set<"left" | "right">> {
  const out = new Map<string, Set<"left" | "right">>();
  for (const [key, sides] of a) out.set(key, new Set(sides));
  for (const [key, sides] of b) {
    const merged = out.get(key) ?? new Set<"left" | "right">();
    for (const side of sides) merged.add(side);
    out.set(key, merged);
  }
  return out;
}
