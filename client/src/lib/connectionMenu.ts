import { fromExternalCards, type LoadTargetItem } from "@/lib/loadTargets";
import type { ExternalReferenceCard } from "@/lib/resolveVisibleTarget";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { ReferenceEntry } from "@/types";

export type TokenConnectionMenuState = {
  token: string;
  kind: SemanticTokenKind;
  role: "usage" | "definition";
  anchor: { x: number; y: number };
  targets: LoadTargetItem[];
  contextFilePath?: string;
};

export function anchorBelowElement(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.bottom + 4 };
}

/** Usage hover lists definitions (source end); definition hover lists callers (target end). */
export function connectionMenuDotSide(role: "usage" | "definition"): "left" | "right" {
  return role === "usage" ? "right" : "left";
}

export function loadTargetsFromExternalCards(
  cards: ExternalReferenceCard[],
): LoadTargetItem[] {
  return fromExternalCards(cards);
}

export function loadTargetsFromCallSiteRefs(
  token: string,
  sites: ReferenceEntry[],
): LoadTargetItem[] {
  return sites.map((site) => ({
    filePath: site.filePath,
    line: site.line,
    label: token,
    subtitle: undefined,
  }));
}

export function buildConnectionMenuState(
  token: string,
  kind: SemanticTokenKind,
  role: "usage" | "definition",
  chipEl: HTMLElement,
  targets: LoadTargetItem[],
  contextFilePath?: string,
): TokenConnectionMenuState | null {
  if (targets.length === 0) return null;
  return {
    token,
    kind,
    role,
    anchor: anchorBelowElement(chipEl),
    targets,
    contextFilePath,
  };
}
