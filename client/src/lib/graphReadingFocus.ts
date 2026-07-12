import type { Node } from "@xyflow/react";
import { computeClassNodeHeight } from "@/lib/classNodeLayout";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

const FOCUS_PARAM = "focus";
const FOCUS_SEP = "|";
const READING_TOP_PADDING = 24;
/** Horizontal inset from the graph pane edge when sizing for reading. */
const READING_SIDE_PADDING = 48;
const READING_MIN_NODE_WIDTH = 400;

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

/** Resolve reading focus from a click inside a class or member container. */
export function resolveFocusFromClick(
  target: EventTarget | null,
): ReadingFocus | null {
  if (!(target instanceof Element)) return null;

  const nodeEl = target.closest<HTMLElement>("[data-flow-node-id]");
  const flowNodeId = nodeEl?.dataset.flowNodeId;
  if (!flowNodeId) return null;

  const memberEl = target.closest<HTMLElement>("[data-member-id]");
  const memberId = memberEl?.dataset.memberId;
  if (memberId) return { flowNodeId, memberId };

  return { flowNodeId };
}

export function readingFocusKey(focus: ReadingFocus | null): string {
  if (!focus) return "";
  return `${focus.flowNodeId}\0${focus.memberId ?? ""}`;
}

export function normalizeReadingFocus(
  nodes: Node[],
  focus: ReadingFocus,
): ReadingFocus {
  const node = nodes.find((n) => n.id === focus.flowNodeId);
  if (!node || node.type !== "class") return focus;
  if (!focus.memberId) return focus;

  const data = node.data as ClassNodeData;
  const memberExists =
    data.methods.some((m) => m.id === focus.memberId) ||
    data.properties.some((p) => p.id === focus.memberId);
  if (memberExists) return focus;
  return { flowNodeId: focus.flowNodeId };
}

function commitClassDimensions(
  node: Node,
  data: ClassNodeData,
  width: number,
  height: number,
): Node {
  return {
    ...node,
    width,
    height,
    style: { ...node.style, width, height },
    data: { ...data, width, height },
  };
}

/** Unwrapped intrinsic width of the rendered card (off-screen clone, no layout flash). */
export function measureClassNaturalWidth(cardEl: HTMLElement): number {
  const clone = cardEl.cloneNode(true) as HTMLElement;
  clone.style.cssText =
    "position:fixed;left:-99999px;top:0;width:max-content;min-width:0;visibility:hidden;pointer-events:none;height:auto;";
  document.body.appendChild(clone);
  const measured = Math.ceil(clone.getBoundingClientRect().width);
  clone.remove();
  return measured;
}

/** Reading width: up to viewport minus padding, but not wider than content needs. */
export function computeReadingWidth(
  paneEl: HTMLElement,
  cardEl: HTMLElement,
  getViewport: () => { zoom: number },
): number {
  const { zoom } = getViewport();
  const paneWidth = paneEl.getBoundingClientRect().width;
  const maxViewportWidth = (paneWidth - READING_SIDE_PADDING * 2) / zoom;
  const contentWidth = measureClassNaturalWidth(cardEl);
  return Math.max(
    READING_MIN_NODE_WIDTH,
    Math.min(maxViewportWidth, contentWidth),
  );
}

export function applyReadingFocusToNodes(
  nodes: Node[],
  focus: ReadingFocus,
  opts?: { width?: number },
): Node[] {
  return nodes.map((n) => {
    const data = n.data as ClassNodeData;
    if (n.id !== focus.flowNodeId || n.type !== "class") {
      return {
        ...n,
        selected: false,
        data: { ...data, selected: false, readingFocusMemberId: undefined },
      };
    }

    const patch: Partial<ClassNodeData> = {
      selected: true,
      collapsed: false,
      readingFocusMemberId: focus.memberId,
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
    const width =
      opts?.width ??
      (typeof n.width === "number" ? n.width : (data.width ?? READING_MIN_NODE_WIDTH));
    const height = computeClassNodeHeight(merged);
    return commitClassDimensions(
      { ...n, selected: true },
      merged,
      width,
      height,
    );
  });
}

export function clearReadingFocusFromNodes(nodes: Node[]): Node[] {
  if (!nodes.some((n) => (n.data as ClassNodeData).readingFocusMemberId)) {
    return nodes;
  }
  return nodes.map((n) => {
    const data = n.data as ClassNodeData;
    if (!data.readingFocusMemberId) return n;
    return { ...n, data: { ...data, readingFocusMemberId: undefined } };
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
