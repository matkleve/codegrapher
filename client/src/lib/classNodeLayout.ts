import type { ClassNodeData, MemberItem } from "@/components/nodes/flowNodeData";

/**
 * All heights below are calibrated against the real rendered DOM
 * (offsetHeight, unaffected by canvas zoom). Keep them in sync with the
 * markup in ClassNode / CollapsibleMemberRow / CodeLine.
 */

/** Header-only node (body hidden); floor for measure + resize. */
export const CLASS_NODE_MIN_HEIGHT = 88;
const HEADER_COLLAPSED = CLASS_NODE_MIN_HEIGHT;
/** Expanded card header (p-2 header ≈85px) + card border. */
const HEADER_HEIGHT = 87;
/** Resize below this hides the body and leaves only the header. */
const BODY_COLLAPSE_HEIGHT = HEADER_HEIGHT + 8;
/** Body p-3 top + bottom. */
const BODY_PADDING = 24;
/** Section label row (22px) + gap to the first member row. */
const SECTION_HEADER = 30;
/** Collapsed member row: p-2 + border + 21px label button. */
const MEMBER_COLLAPSED = 39;
const MEMBER_GAP = 8;
/** Separator line + body gap above and below it. */
const SECTION_GAP = 17;
/** Small hysteresis so estimate error doesn't flap rows open/closed. */
const FIT_SLACK = 6;

/** Code block: mt-1.5 above, 20px per non-empty line, 2px gap between lines. */
const CODE_TOP_MARGIN = 6;
const CODE_LINE_HEIGHT = 20;
const CODE_LINE_GAP = 2;

function estimateExpandedMemberHeight(code: string): number {
  const lines = code.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0).length;
  return (
    MEMBER_COLLAPSED +
    CODE_TOP_MARGIN +
    Math.max(1, nonEmpty) * CODE_LINE_HEIGHT +
    Math.max(0, lines.length - 1) * CODE_LINE_GAP
  );
}

type LayoutMember = {
  id: string;
  collapsedHeight: number;
  expandedHeight: number;
};

function buildMemberList(items: MemberItem[]): LayoutMember[] {
  return items.map((item) => ({
    id: item.id,
    collapsedHeight: MEMBER_COLLAPSED,
    expandedHeight: estimateExpandedMemberHeight(item.code),
  }));
}

function memberListHeight(
  members: LayoutMember[],
  expandedIds: Set<string>,
  sectionOpen: boolean,
): number {
  if (members.length === 0 || !sectionOpen) return 0;
  let h = 0;
  for (let i = 0; i < members.length; i++) {
    const m = members[i]!;
    h += expandedIds.has(m.id) ? m.expandedHeight : m.collapsedHeight;
    if (i > 0) h += MEMBER_GAP;
  }
  return h;
}

export type ClassLayoutPreference = {
  expandedPropertyIds: string[];
  expandedMethodIds: string[];
  propertiesSectionCollapsed: boolean;
  methodsSectionCollapsed: boolean;
};

export function getLayoutPreference(data: ClassNodeData): ClassLayoutPreference {
  if (data.layoutPreference) return data.layoutPreference;
  return {
    expandedPropertyIds: [...data.expandedPropertyIds],
    expandedMethodIds: [...data.expandedMethodIds],
    propertiesSectionCollapsed: data.propertiesSectionCollapsed ?? false,
    methodsSectionCollapsed: data.methodsSectionCollapsed ?? false,
  };
}

export function layoutPreferenceFromData(data: ClassNodeData): ClassLayoutPreference {
  return {
    expandedPropertyIds: [...data.expandedPropertyIds],
    expandedMethodIds: [...data.expandedMethodIds],
    propertiesSectionCollapsed: data.propertiesSectionCollapsed ?? false,
    methodsSectionCollapsed: data.methodsSectionCollapsed ?? false,
  };
}

export function computeClassNodeHeight(data: ClassNodeData): number {
  if (data.collapsed) return HEADER_COLLAPSED;

  const props = buildMemberList(data.properties);
  const methods = buildMemberList(data.methods);
  const expandedProps = new Set(data.expandedPropertyIds);
  const expandedMethods = new Set(data.expandedMethodIds);
  const propsOpen = !(data.propertiesSectionCollapsed ?? false);
  const methodsOpen = !(data.methodsSectionCollapsed ?? false);

  let total = HEADER_HEIGHT + BODY_PADDING;

  if (props.length > 0) {
    total += SECTION_HEADER;
    total += memberListHeight(props, expandedProps, propsOpen);
  }

  if (props.length > 0 && methods.length > 0) {
    total += SECTION_GAP;
  }

  if (methods.length > 0) {
    total += SECTION_HEADER;
    total += memberListHeight(methods, expandedMethods, methodsOpen);
  }

  return Math.max(CLASS_NODE_MIN_HEIGHT, total);
}

export type FitExpandedResult = {
  expandedPropertyIds: string[];
  expandedMethodIds: string[];
  propertiesSectionCollapsed: boolean;
  methodsSectionCollapsed: boolean;
  collapsed: boolean;
};

export type FitExpandedOptions = {
  /** When true (resize), pinned members may collapse to fit height. */
  ignorePinned?: boolean;
};

type LayoutState = FitExpandedResult;

function stateHeight(data: ClassNodeData, state: LayoutState): number {
  return computeClassNodeHeight({
    ...data,
    collapsed: state.collapsed,
    expandedPropertyIds: state.expandedPropertyIds,
    expandedMethodIds: state.expandedMethodIds,
    propertiesSectionCollapsed: state.propertiesSectionCollapsed,
    methodsSectionCollapsed: state.methodsSectionCollapsed,
  });
}

function snapshotFromData(data: ClassNodeData): LayoutState {
  return {
    collapsed: data.collapsed ?? false,
    expandedPropertyIds: [...data.expandedPropertyIds],
    expandedMethodIds: [...data.expandedMethodIds],
    propertiesSectionCollapsed: data.propertiesSectionCollapsed ?? false,
    methodsSectionCollapsed: data.methodsSectionCollapsed ?? false,
  };
}

/**
 * Height-driven layout with deterministic breakpoints.
 *
 * Opening order while growing: properties section, methods section, then
 * members strictly top to bottom (all properties, then all methods). The
 * next member only opens once its expanded row fits — nothing is skipped.
 * Closing while shrinking is the exact reverse: members bottom to top,
 * then the sections, then the whole body.
 */
export function fitLayoutToHeight(
  data: ClassNodeData,
  targetHeight: number,
  options?: FitExpandedOptions,
): FitExpandedResult {
  const pinned = options?.ignorePinned
    ? new Set<string>()
    : new Set(data.pinnedMemberIds ?? []);
  const props = buildMemberList(data.properties);
  const methods = buildMemberList(data.methods);

  if (targetHeight <= BODY_COLLAPSE_HEIGHT) {
    return {
      collapsed: true,
      expandedPropertyIds: [],
      expandedMethodIds: [],
      propertiesSectionCollapsed: true,
      methodsSectionCollapsed: true,
    };
  }

  const state = snapshotFromData(data);
  state.collapsed = false;

  const height = () => stateHeight(data, state);

  // Collapse the bottom-most expanded member (document order, not
  // insertion order) so shrinking closes last → first.
  const collapseLast = (members: LayoutMember[], ids: string[]): boolean => {
    for (let i = members.length - 1; i >= 0; i--) {
      const id = members[i]!.id;
      const idx = ids.indexOf(id);
      if (idx !== -1 && !pinned.has(id)) {
        ids.splice(idx, 1);
        return true;
      }
    }
    return false;
  };

  // Close eagerly: the moment the open content would exceed the box, drop the
  // bottom-most member. This keeps functions from being clipped while shrinking
  // (better to show empty space than a cut-off row — the snap-back removes it).
  let guard = 0;
  while (height() > targetHeight && guard++ < 400) {
    if (collapseLast(methods, state.expandedMethodIds)) continue;
    if (collapseLast(props, state.expandedPropertyIds)) continue;

    if (methods.length > 0 && !state.methodsSectionCollapsed) {
      state.methodsSectionCollapsed = true;
      state.expandedMethodIds = state.expandedMethodIds.filter((id) =>
        pinned.has(id),
      );
      continue;
    }

    if (props.length > 0 && !state.propertiesSectionCollapsed) {
      state.propertiesSectionCollapsed = true;
      state.expandedPropertyIds = state.expandedPropertyIds.filter((id) =>
        pinned.has(id),
      );
      continue;
    }

    if (!state.collapsed) {
      state.collapsed = true;
      state.expandedPropertyIds = [];
      state.expandedMethodIds = [];
      state.propertiesSectionCollapsed = true;
      state.methodsSectionCollapsed = true;
      continue;
    }

    break;
  }

  // A member only expands while its expanded row still fits the target
  // height, so dragging taller opens members one by one at breakpoints.
  const expandFits = (m: LayoutMember): boolean =>
    height() - m.collapsedHeight + m.expandedHeight <= targetHeight + FIT_SLACK;

  guard = 0;
  while (height() < targetHeight - FIT_SLACK && guard++ < 400) {
    if (state.collapsed) {
      state.collapsed = false;
      state.propertiesSectionCollapsed = props.length > 0;
      state.methodsSectionCollapsed = methods.length > 0;
      continue;
    }

    if (props.length > 0 && state.propertiesSectionCollapsed) {
      state.propertiesSectionCollapsed = false;
      continue;
    }

    if (methods.length > 0 && state.methodsSectionCollapsed) {
      state.methodsSectionCollapsed = false;
      continue;
    }

    // Strictly the next unexpanded member top to bottom — if it doesn't
    // fit yet, wait for more height instead of skipping past it.
    const nextMember =
      props.find((m) => !state.expandedPropertyIds.includes(m.id)) ??
      methods.find((m) => !state.expandedMethodIds.includes(m.id));
    if (!nextMember || !expandFits(nextMember)) break;

    if (props.some((m) => m.id === nextMember.id)) {
      state.expandedPropertyIds.push(nextMember.id);
    } else {
      state.expandedMethodIds.push(nextMember.id);
    }
  }

  return { ...state };
}

/** @deprecated Use fitLayoutToHeight */
export function fitExpandedToHeight(
  data: ClassNodeData,
  targetHeight: number,
  options?: FitExpandedOptions,
): FitExpandedResult {
  return fitLayoutToHeight(data, targetHeight, options);
}

export function resolveNodeHeight(
  data: ClassNodeData,
  requestedHeight?: number,
): number {
  const contentHeight = computeClassNodeHeight(data);
  if (requestedHeight == null) return contentHeight;
  return Math.max(requestedHeight, contentHeight);
}
