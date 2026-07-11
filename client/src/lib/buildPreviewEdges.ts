import type { LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { ExternalReferenceCard, GraphVisibleTarget } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export function liveToFromUsageEl(
  token: string,
  usageEl: HTMLElement,
): LiveAnchorHint | undefined {
  const traceKey = usageEl.dataset.traceKey;
  if (!traceKey) return undefined;
  const parts = traceKey.split("::");
  if (parts.length === 4 && parts[2] === "sig-type") {
    return {
      token: parts[3] ?? token,
      flowNodeId: parts[0]!,
      memberId: parts[1]!,
      role: "usage",
      traceKey,
    };
  }
  if (parts.length < 4) return undefined;
  const lineNumber = Number(parts[2]);
  if (!Number.isFinite(lineNumber)) return undefined;
  return {
    token,
    flowNodeId: parts[0]!,
    memberId: parts[1],
    lineNumber,
    role: "usage",
    traceKey,
  };
}

export function liveFromDefEl(
  token: string,
  definitionEl: HTMLElement,
  flowNodeId?: string,
  memberId?: string,
): LiveAnchorHint {
  return {
    token,
    flowNodeId:
      flowNodeId ??
      definitionEl.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ??
      "",
    memberId:
      memberId ??
      definitionEl.closest<HTMLElement>("[data-member-id]")?.dataset.memberId,
    role: "definition",
    traceKey: definitionEl.dataset.traceKey,
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
  const toToken = toEl.dataset.symbolName ?? "";
  const fromToken =
    fromEl.dataset.symbolName ??
    fromEl.dataset.traceKey?.split("::").pop() ??
    "";
  return {
    id: edgeId,
    from: { type: "element", el: fromEl },
    to: { type: "element", el: toEl },
    kind,
    liveFrom: liveFromDefEl(fromToken, fromEl),
    liveTo: liveToFromUsageEl(toToken, toEl),
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
      direction: "definition",
    },
    liveTo: liveToFromUsageEl(token, usageEl),
  };
}

/** Dashed load stub beside a definition — pull in files that call it. */
export function buildCallSiteLoadPreviewEdge(
  edgeId: string,
  sites: ExternalReferenceCard[],
  definitionEl: HTMLElement,
  token: string,
  kind: SemanticTokenKind,
): PreviewEdgeSpec {
  const primary = sites[0];
  if (!primary) {
    throw new Error("buildCallSiteLoadPreviewEdge requires at least one site");
  }

  return {
    id: edgeId,
    from: { type: "element", el: definitionEl },
    to: { type: "element", el: definitionEl },
    kind,
    load: {
      token,
      filePath: primary.filePath,
      line: primary.line,
      occurrenceCount: sites.length,
      candidates: sites,
      direction: "callSite",
    },
    liveFrom: {
      token,
      flowNodeId:
        definitionEl.closest<HTMLElement>("[data-flow-node-id]")?.dataset.flowNodeId ??
        "",
      role: "definition",
    },
  };
}
