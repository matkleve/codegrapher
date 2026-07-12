import { fileDirHint, fromExternalCards, type LoadTargetItem } from "@/lib/loadTargets";
import type { CallSiteReference } from "@/lib/projectReferences";
import type { ExternalReferenceCard } from "@/lib/resolveVisibleTarget";
import type { TokenReference } from "@/lib/semanticLookup";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { ReferenceEntry } from "@/types";

export type ConnectionMenuAction = "jump" | "load" | "openEditor";

export type ConnectionMenuRow = {
  id: string;
  primaryLabel: string;
  secondaryLabel: string;
  kind: SemanticTokenKind;
  action: ConnectionMenuAction;
  locality: "onCanvas" | "offCanvas";
  filePath: string;
  line: number;
  flowNodeId?: string;
  memberId?: string;
};

export type ConnectionMenuSection = {
  id: "onCanvas" | "offCanvas";
  title: string;
  rows: ConnectionMenuRow[];
};

export type TokenConnectionMenuState = {
  token: string;
  kind: SemanticTokenKind;
  role: "usage" | "definition";
  anchor: { x: number; y: number; placement?: "above" | "below" };
  variant: "hover" | "context";
  sections: ConnectionMenuSection[];
  contextFilePath?: string;
  showRightClickHint?: boolean;
  editorTarget?: { filePath: string; line: number };
  simActions?: { id: string; label: string; onSelect: () => void }[];
};

export function anchorBelowElement(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.bottom + 4 };
}

export function anchorAboveElement(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top - 4 };
}

/** Hover menus in member bodies open upward so they do not cover the token. */
export function hoverMenuAnchor(
  el: HTMLElement,
): { x: number; y: number; placement: "above" | "below" } {
  if (el.closest(".code-line")) {
    return { ...anchorAboveElement(el), placement: "above" };
  }
  return { ...anchorBelowElement(el), placement: "below" };
}

/** Usage hover lists definitions (source end); definition hover lists callers (target end). */
export function connectionMenuDotSide(role: "usage" | "definition"): "left" | "right" {
  return role === "usage" ? "right" : "left";
}

function refPrimaryLabel(ref: TokenReference): string {
  return ref.memberLabel ? `${ref.classLabel} → ${ref.memberLabel}` : ref.classLabel;
}

function refSecondaryLabel(ref: TokenReference): string {
  const dir = fileDirHint(ref.filePath);
  return `${dir ? `${dir} · ` : ""}line ${ref.line}`;
}

function loadItemToRow(
  item: LoadTargetItem,
  token: string,
  kind: SemanticTokenKind,
  _role: "usage" | "definition",
): ConnectionMenuRow {
  const primary =
    item.label !== token ? item.label : item.subtitle?.split("/").pop() ?? item.label;
  const dir = item.subtitle ?? fileDirHint(item.filePath);
  return {
    id: `load-${item.filePath}-${item.line}`,
    primaryLabel: primary,
    secondaryLabel: `${dir ? `${dir} · ` : ""}line ${item.line}`,
    kind,
    action: "load",
    locality: "offCanvas",
    filePath: item.filePath,
    line: item.line,
  };
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
    subtitle: fileDirHint(site.filePath),
  }));
}

export function buildUsageContextSections(
  token: string,
  kind: SemanticTokenKind,
  refs: TokenReference[],
): ConnectionMenuSection[] {
  const sections: ConnectionMenuSection[] = [];
  const onCanvas = refs.filter((r) => r.inGraph && r.flowNodeId);
  const offCanvas = refs.filter((r) => !r.inGraph);

  if (onCanvas.length > 0) {
    sections.push({
      id: "onCanvas",
      title: "On canvas",
      rows: onCanvas.map((ref) => ({
        id: `jump-${ref.filePath}-${ref.line}`,
        primaryLabel: refPrimaryLabel(ref),
        secondaryLabel: `${refSecondaryLabel(ref)} · on canvas`,
        kind: ref.kind,
        action: "jump",
        locality: "onCanvas",
        filePath: ref.filePath,
        line: ref.line,
        flowNodeId: ref.flowNodeId,
      })),
    });
  }

  if (offCanvas.length > 0) {
    sections.push({
      id: "offCanvas",
      title: "Off canvas",
      rows: offCanvas.map((ref) => ({
        id: `load-${ref.filePath}-${ref.line}`,
        primaryLabel: refPrimaryLabel(ref),
        secondaryLabel: refSecondaryLabel(ref),
        kind: ref.kind,
        action: "load",
        locality: "offCanvas",
        filePath: ref.filePath,
        line: ref.line,
      })),
    });
  }

  if (sections.length === 0 && refs.length > 0) {
    sections.push({
      id: "offCanvas",
      title: "In project",
      rows: refs.map((ref) => ({
        id: `load-${ref.filePath}-${ref.line}`,
        primaryLabel: refPrimaryLabel(ref),
        secondaryLabel: refSecondaryLabel(ref),
        kind: ref.kind,
        action: "load",
        locality: "offCanvas",
        filePath: ref.filePath,
        line: ref.line,
      })),
    });
  }

  void token;
  void kind;
  return sections;
}

export function buildDefinitionContextSections(
  token: string,
  kind: SemanticTokenKind,
  usageSites: UsageSiteRecord[],
  callSites: CallSiteReference[],
): ConnectionMenuSection[] {
  const sections: ConnectionMenuSection[] = [];

  if (usageSites.length > 0) {
    sections.push({
      id: "onCanvas",
      title: "On canvas",
      rows: usageSites.map((site, idx) => ({
        id: `jump-usage-${site.flowNodeId}-${site.memberId}-${site.lineNumber}-${idx}`,
        primaryLabel: `${token} usage`,
        secondaryLabel: `line ${site.lineNumber} · on canvas`,
        kind,
        action: "jump",
        locality: "onCanvas",
        filePath: "",
        line: site.lineNumber,
        flowNodeId: site.flowNodeId,
        memberId: site.memberId,
      })),
    });
  }

  const offCanvas = callSites.filter((s) => !s.inGraph);
  if (offCanvas.length > 0) {
    sections.push({
      id: "offCanvas",
      title: "Callers off canvas",
      rows: offCanvas.map((site) => ({
        id: `load-caller-${site.filePath}-${site.line}`,
        primaryLabel: fileDirHint(site.filePath).split("/").pop() ?? site.filePath,
        secondaryLabel: `${fileDirHint(site.filePath)} · line ${site.line}`,
        kind,
        action: "load",
        locality: "offCanvas",
        filePath: site.filePath,
        line: site.line,
      })),
    });
  }

  return sections;
}

function hoverSectionsFromLoadTargets(
  token: string,
  kind: SemanticTokenKind,
  role: "usage" | "definition",
  targets: LoadTargetItem[],
): ConnectionMenuSection[] {
  return [
    {
      id: "offCanvas",
      title: role === "usage" ? "Definitions to load" : "Callers to load",
      rows: targets.map((t) => loadItemToRow(t, token, kind, role)),
    },
  ];
}

export function buildHoverLoadMenu(
  token: string,
  kind: SemanticTokenKind,
  role: "usage" | "definition",
  chipEl: HTMLElement,
  targets: LoadTargetItem[],
  contextFilePath?: string,
): TokenConnectionMenuState | null {
  // The hover dropdown is now the sole load surface (the floating Load pill was
  // removed), so a single off-canvas target still gets a one-row menu.
  if (targets.length === 0) return null;
  return {
    token,
    kind,
    role,
    anchor: hoverMenuAnchor(chipEl),
    variant: "hover",
    sections: hoverSectionsFromLoadTargets(token, kind, role, targets),
    contextFilePath,
    showRightClickHint: true,
  };
}

export function buildContextMenu(
  token: string,
  kind: SemanticTokenKind,
  role: "usage" | "definition",
  chipEl: HTMLElement,
  sections: ConnectionMenuSection[],
  contextFilePath?: string,
  editorTarget?: { filePath: string; line: number },
): TokenConnectionMenuState | null {
  const nonEmpty = sections.filter((s) => s.rows.length > 0);
  if (nonEmpty.length === 0) return null;
  return {
    token,
    kind,
    role,
    anchor: anchorBelowElement(chipEl),
    variant: "context",
    sections: nonEmpty,
    contextFilePath,
    editorTarget,
  };
}

/** @deprecated use buildHoverLoadMenu */
export function buildConnectionMenuState(
  token: string,
  kind: SemanticTokenKind,
  role: "usage" | "definition",
  chipEl: HTMLElement,
  targets: LoadTargetItem[],
  contextFilePath?: string,
): TokenConnectionMenuState | null {
  return buildHoverLoadMenu(token, kind, role, chipEl, targets, contextFilePath);
}
