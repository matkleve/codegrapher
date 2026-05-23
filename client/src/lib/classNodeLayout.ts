import type { ClassNodeData, MemberItem } from "@/components/nodes/flowNodeData";

/** Layout constants tuned to match ClassNode + CollapsibleMemberRow DOM. */
const HEADER_HEIGHT = 90;
export const CLASS_NODE_MIN_HEIGHT = 72;
const HEADER_COLLAPSED = CLASS_NODE_MIN_HEIGHT;
/** Resize below this hides the body and leaves only the header. */
const BODY_COLLAPSE_HEIGHT = HEADER_HEIGHT + 4;
const BODY_PADDING = 24;
const SECTION_HEADER = 28;
const MEMBER_COLLAPSED = 40;
const MEMBER_GAP = 8;
/** Body flex gap-2 on each side of the section separator. */
const SECTION_GAP = 16;

function estimateExpandedMemberHeight(code: string): number {
  const lines = Math.max(1, code.split("\n").length);
  const rowChrome = 48 + 6;
  const codeHeight = Math.min(lines * 20, 256);
  return rowChrome + codeHeight + 8;
}

type LayoutMember = {
  id: string;
  code: string;
  collapsedHeight: number;
  expandedHeight: number;
};

function buildMemberList(items: MemberItem[]): LayoutMember[] {
  return items.map((item) => ({
    id: item.id,
    code: item.code,
    collapsedHeight: MEMBER_COLLAPSED,
    expandedHeight: estimateExpandedMemberHeight(item.code),
  }));
}

export function computeClassNodeHeight(data: ClassNodeData): number {
  if (data.collapsed) return HEADER_COLLAPSED;

  let total = HEADER_HEIGHT + BODY_PADDING;
  const props = buildMemberList(data.properties);
  const methods = buildMemberList(data.methods);
  const expandedProps = new Set(data.expandedPropertyIds);
  const expandedMethods = new Set(data.expandedMethodIds);

  if (props.length > 0 && !data.propertiesSectionCollapsed) {
    total += SECTION_HEADER;
    for (let i = 0; i < props.length; i++) {
      const m = props[i]!;
      total += expandedProps.has(m.id) ? m.expandedHeight : m.collapsedHeight;
      if (i > 0) total += MEMBER_GAP;
    }
  }

  if (props.length > 0 && methods.length > 0) total += SECTION_GAP;

  if (methods.length > 0 && !data.methodsSectionCollapsed) {
    total += SECTION_HEADER;
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i]!;
      total += expandedMethods.has(m.id) ? m.expandedHeight : m.collapsedHeight;
      if (i > 0) total += MEMBER_GAP;
    }
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

/**
 * Given a target node height, expand members top-to-bottom until space runs out.
 * Pinned ids stay expanded; shrinking collapses from the bottom.
 */
export function fitExpandedToHeight(
  data: ClassNodeData,
  targetHeight: number,
): FitExpandedResult {
  const pinned = new Set(data.pinnedMemberIds ?? []);
  const expandedPropertyIds: string[] = [];
  const expandedMethodIds: string[] = [];

  if (targetHeight <= BODY_COLLAPSE_HEIGHT) {
    return {
      collapsed: true,
      expandedPropertyIds: [],
      expandedMethodIds: [],
      propertiesSectionCollapsed: true,
      methodsSectionCollapsed: true,
    };
  }

  let used = HEADER_HEIGHT + BODY_PADDING;
  const props = buildMemberList(data.properties);
  const methods = buildMemberList(data.methods);

  let propertiesSectionCollapsed = props.length === 0;
  let methodsSectionCollapsed = methods.length === 0;

  if (props.length > 0) {
    if (used + SECTION_HEADER > targetHeight) {
      propertiesSectionCollapsed = true;
    } else {
      propertiesSectionCollapsed = false;
      used += SECTION_HEADER;

      for (let i = 0; i < props.length; i++) {
        const member = props[i]!;
        if (i > 0) used += MEMBER_GAP;

        const mustExpand = pinned.has(member.id);
        if (mustExpand) {
          expandedPropertyIds.push(member.id);
          used += member.expandedHeight;
          continue;
        }

        if (used + member.expandedHeight <= targetHeight) {
          expandedPropertyIds.push(member.id);
          used += member.expandedHeight;
        } else if (used + member.collapsedHeight <= targetHeight) {
          used += member.collapsedHeight;
        } else {
          break;
        }
      }
    }
  }

  if (props.length > 0 && methods.length > 0 && !propertiesSectionCollapsed) {
    used += SECTION_GAP;
  }

  if (methods.length > 0) {
    if (used + SECTION_HEADER > targetHeight) {
      methodsSectionCollapsed = true;
    } else {
      methodsSectionCollapsed = false;
      used += SECTION_HEADER;

      for (let i = 0; i < methods.length; i++) {
        const member = methods[i]!;
        if (i > 0) used += MEMBER_GAP;

        const mustExpand = pinned.has(member.id);
        if (mustExpand) {
          expandedMethodIds.push(member.id);
          used += member.expandedHeight;
          continue;
        }

        if (used + member.expandedHeight <= targetHeight) {
          expandedMethodIds.push(member.id);
          used += member.expandedHeight;
        } else if (used + member.collapsedHeight <= targetHeight) {
          used += member.collapsedHeight;
        } else {
          break;
        }
      }
    }
  }

  for (const id of pinned) {
    if (props.some((p) => p.id === id) && !expandedPropertyIds.includes(id)) {
      expandedPropertyIds.push(id);
    }
    if (methods.some((m) => m.id === id) && !expandedMethodIds.includes(id)) {
      expandedMethodIds.push(id);
    }
  }

  return {
    collapsed: false,
    expandedPropertyIds,
    expandedMethodIds,
    propertiesSectionCollapsed,
    methodsSectionCollapsed,
  };
}

/** Grow to fit content when opening; otherwise use the requested height. */
export function resolveNodeHeight(
  data: ClassNodeData,
  requestedHeight?: number,
): number {
  const contentHeight = computeClassNodeHeight(data);
  if (requestedHeight == null) return contentHeight;
  return Math.max(requestedHeight, contentHeight);
}
