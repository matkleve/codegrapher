import type { Node } from "@xyflow/react";
import { computeClassNodeHeight } from "@/lib/classNodeLayout";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

const FOCUS_PARAM = "focus";
const FOCUS_SEP = "|";
const READING_TOP_PADDING = 24;

export type ReadingFocus = {
  flowNodeId: string;
  memberId?: string;
};

export function parseFocusFromUrl(): ReadingFocus | null {
  const raw = new URL(window.location.href).searchParams.get(FOCUS_PARAM);
  if (!raw) return null;
  const sep = raw.indexOf(FOCUS_SEP);
  if (sep === -1) return { flowNodeId: raw };
  return { flowNodeId: raw.slice(0, sep), memberId: raw.slice(sep + 1) };
}

export function writeFocusToUrl(focus: ReadingFocus): void {
  const value = focus.memberId
    ? `${focus.flowNodeId}${FOCUS_SEP}${focus.memberId}`
    : focus.flowNodeId;
  const url = new URL(window.location.href);
  if (url.searchParams.get(FOCUS_PARAM) === value) return;
  url.searchParams.set(FOCUS_PARAM, value);
  window.history.replaceState(null, "", url);
}

export function clearFocusFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(FOCUS_PARAM)) return;
  url.searchParams.delete(FOCUS_PARAM);
  window.history.replaceState(null, "", url);
}

function isNodeSelected(node: Node): boolean {
  const data = node.data as { selected?: boolean };
  return Boolean(node.selected || data.selected);
}

/** Selected class node, or any class with an expanded member; narrows to last expanded member. */
export function resolveReadingFocus(nodes: Node[]): ReadingFocus | null {
  const selected = nodes.find((n) => n.type === "class" && isNodeSelected(n));
  const node =
    selected ??
    nodes.find((n) => {
      if (n.type !== "class") return false;
      const data = n.data as ClassNodeData;
      return (
        data.expandedMethodIds.length > 0 || data.expandedPropertyIds.length > 0
      );
    });
  if (!node) return null;

  const data = node.data as ClassNodeData;
  const memberId =
    data.expandedMethodIds.at(-1) ?? data.expandedPropertyIds.at(-1);

  return { flowNodeId: node.id, memberId };
}

export function readingFocusKey(nodes: Node[]): string {
  const focus = resolveReadingFocus(nodes);
  if (!focus) return "";
  return `${focus.flowNodeId}\0${focus.memberId ?? ""}`;
}

export function applyReadingFocusToNodes(
  nodes: Node[],
  focus: ReadingFocus,
): Node[] {
  return nodes.map((n) => {
    const data = n.data as ClassNodeData;
    if (n.id !== focus.flowNodeId || n.type !== "class") {
      return {
        ...n,
        selected: false,
        data: { ...data, selected: false },
      };
    }

    const patch: Partial<ClassNodeData> = {
      selected: true,
      collapsed: false,
    };

    if (focus.memberId) {
      const isMethod = data.methods.some((m) => m.id === focus.memberId);
      const isProperty = data.properties.some((p) => p.id === focus.memberId);
      if (isMethod) {
        patch.expandedMethodIds = [
          ...new Set([...data.expandedMethodIds, focus.memberId]),
        ];
        patch.methodsSectionCollapsed = false;
      } else if (isProperty) {
        patch.expandedPropertyIds = [
          ...new Set([...data.expandedPropertyIds, focus.memberId]),
        ];
        patch.propertiesSectionCollapsed = false;
      }
    }

    const merged: ClassNodeData = { ...data, ...patch };
    const height = computeClassNodeHeight(merged);
    return {
      ...n,
      selected: true,
      data: { ...merged, height },
    };
  });
}

export function findFocusTargetElement(focus: ReadingFocus): HTMLElement | null {
  if (focus.memberId) {
    const el = document.querySelector(
      `[data-member-id="${CSS.escape(focus.memberId)}"]`,
    );
    if (el instanceof HTMLElement) return el;
  }
  const nodeEl = document.querySelector(
    `[data-flow-node-id="${CSS.escape(focus.flowNodeId)}"]`,
  );
  return nodeEl instanceof HTMLElement ? nodeEl : null;
}

type ScrollToReadingArgs = {
  paneEl: HTMLElement;
  targetEl: HTMLElement;
  getViewport: () => { x: number; y: number; zoom: number };
  setViewport: (
    viewport: { x: number; y: number; zoom: number },
    options?: { duration?: number },
  ) => void;
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
};

/** Place target top-center at horizontal center + top padding (document reading). */
export function scrollToReadingPosition({
  paneEl,
  targetEl,
  getViewport,
  setViewport,
  screenToFlowPosition,
}: ScrollToReadingArgs): void {
  const paneRect = paneEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetTop = targetRect.top;
  const { zoom } = getViewport();
  const flowPos = screenToFlowPosition({ x: targetCenterX, y: targetTop });
  const paneWidth = paneRect.width;

  setViewport(
    {
      x: paneWidth / 2 - flowPos.x * zoom,
      y: READING_TOP_PADDING - flowPos.y * zoom,
      zoom,
    },
    { duration: 350 },
  );
}
