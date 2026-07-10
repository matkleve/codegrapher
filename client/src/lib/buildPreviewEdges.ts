import type { LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { ExternalReferenceCard, GraphVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";

function liveToFromUsageEl(token: string, usageEl: HTMLElement): LiveAnchorHint | undefined {
  const traceKey = usageEl.dataset.traceKey;
  if (!traceKey) return undefined;
  const parts = traceKey.split("::");
  if (parts.length < 4) return undefined;
  return {
    token,
    flowNodeId: parts[0]!,
    memberId: parts[1],
    lineNumber: Number(parts[2]),
    role: "usage",
  };
}

export function buildUsagePreviewEdge(
  edgeId: string,
  target: GraphVisibleTarget,
  usageEl: HTMLElement,
  token: string,
): PreviewEdgeSpec {
  const from =
    target.definitionEl?.isConnected
      ? { type: "element" as const, el: target.definitionEl }
      : { type: "handle" as const, handle: target.targetHandle };

  return {
    id: edgeId,
    from,
    to: { type: "element", el: usageEl },
    kind: target.kind,
    liveFrom: {
      token,
      flowNodeId: target.flowNodeId,
      memberId: target.memberId,
      lineNumber: target.lineNumber,
      role: "definition",
    },
    liveTo: liveToFromUsageEl(token, usageEl),
  };
}

export function buildDefinitionFanOutEdges(
  token: string,
  kind: SemanticTokenKind,
  definitionEl: HTMLElement,
  usageEls: HTMLElement[],
): PreviewEdgeSpec[] {
  return usageEls.map((usageEl, index) => ({
    id: `def-${token}-${index}`,
    from: { type: "element", el: definitionEl },
    to: { type: "element", el: usageEl },
    kind,
  }));
}

export function buildElementPreviewEdge(
  edgeId: string,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  kind: SemanticTokenKind,
): PreviewEdgeSpec {
  return {
    id: edgeId,
    from: { type: "element", el: fromEl },
    to: { type: "element", el: toEl },
    kind,
  };
}

/** Dashed load stub from off-graph definition to an on-graph usage chip. */
export function buildLoadPreviewEdge(
  edgeId: string,
  cards: ExternalReferenceCard[],
  usageEl: HTMLElement,
  token: string,
  kind: SemanticTokenKind,
): PreviewEdgeSpec {
  const primary = cards[0];
  if (!primary) {
    throw new Error("buildLoadPreviewEdge requires at least one card");
  }

  return {
    id: edgeId,
    from: { type: "element", el: usageEl },
    to: { type: "element", el: usageEl },
    kind,
    load: {
      token,
      filePath: primary.filePath,
      line: primary.line,
      occurrenceCount: cards.length,
      candidates: cards,
    },
    liveTo: liveToFromUsageEl(token, usageEl),
  };
}
