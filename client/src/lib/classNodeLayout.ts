import type { ClassNodeData, MemberItem } from "@/components/nodes/flowNodeData";

/** Header-only node (body hidden); floor for measure + resize. */
export const CLASS_NODE_MIN_HEIGHT = 88;
const HEADER_COLLAPSED = CLASS_NODE_MIN_HEIGHT;
/** Expanded card header (chip + title + chrome). */
const HEADER_HEIGHT = 96;
/** Resize below this hides the body and leaves only the header. */
const BODY_COLLAPSE_HEIGHT = HEADER_HEIGHT + 8;
const BODY_PADDING = 24;
const SECTION_HEADER = 28;
const MEMBER_COLLAPSED = 36;
const MEMBER_GAP = 8;
const SECTION_GAP = 16;
/** Avoid collapsing while estimates still fit inside the box. */
const FIT_SLACK = 20;

function estimateExpandedMemberHeight(code: string): number {
  const lines = Math.max(1, code.split("\n").length);
  const rowChrome = 44 + 6;
  return rowChrome + lines * 19 + 8;
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
 * Shrink bottom-up, then expand toward layoutPreference when height allows.
 */
export function fitLayoutToHeight(
  data: ClassNodeData,
  targetHeight: number,
  options?: FitExpandedOptions,
): FitExpandedResult {
  const pinned = options?.ignorePinned
    ? new Set<string>()
    : new Set(data.pinnedMemberIds ?? []);
  const pref = getLayoutPreference(data);
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

  const popUnpinned = (ids: string[]): boolean => {
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i]!;
      if (!pinned.has(id)) {
        ids.splice(i, 1);
        return true;
      }
    }
    return false;
  };

  let guard = 0;
  while (height() > targetHeight + FIT_SLACK && guard++ < 200) {
    if (popUnpinned(state.expandedMethodIds)) continue;

    if (methods.length > 0 && !state.methodsSectionCollapsed) {
      state.methodsSectionCollapsed = true;
      state.expandedMethodIds = state.expandedMethodIds.filter((id) =>
        pinned.has(id),
      );
      continue;
    }

    if (popUnpinned(state.expandedPropertyIds)) continue;

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

  guard = 0;
  while (height() < targetHeight - FIT_SLACK && guard++ < 200) {
    if (state.collapsed) {
      state.collapsed = false;
      state.propertiesSectionCollapsed = pref.propertiesSectionCollapsed;
      state.methodsSectionCollapsed = pref.methodsSectionCollapsed;
      state.expandedPropertyIds = [...pref.expandedPropertyIds];
      state.expandedMethodIds = [...pref.expandedMethodIds];
      continue;
    }

    if (
      props.length > 0 &&
      pref.propertiesSectionCollapsed === false &&
      state.propertiesSectionCollapsed
    ) {
      state.propertiesSectionCollapsed = false;
      continue;
    }

    const nextProp = pref.expandedPropertyIds.find(
      (id) => !state.expandedPropertyIds.includes(id),
    );
    if (nextProp && !state.propertiesSectionCollapsed) {
      state.expandedPropertyIds.push(nextProp);
      continue;
    }

    if (
      methods.length > 0 &&
      pref.methodsSectionCollapsed === false &&
      state.methodsSectionCollapsed
    ) {
      state.methodsSectionCollapsed = false;
      continue;
    }

    const nextMethod = pref.expandedMethodIds.find(
      (id) => !state.expandedMethodIds.includes(id),
    );
    if (nextMethod && !state.methodsSectionCollapsed) {
      state.expandedMethodIds.push(nextMethod);
      continue;
    }

    break;
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
