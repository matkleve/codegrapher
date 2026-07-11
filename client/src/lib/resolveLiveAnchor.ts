import {
  previewLineHandle,
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { getByMemberId, getByTraceKey } from "@/lib/elementRegistry";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import type { AnchorRef, LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";

function graphPane(): HTMLElement | null {
  return document.querySelector(".graph-pane");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

export function findMemberDefLabel(
  flowNodeId: string,
  memberId: string,
  token: string,
): HTMLElement | null {
  const fromMember = getByMemberId(memberId);
  if (fromMember?.isConnected) {
    const label = fromMember.querySelector<HTMLElement>(
      `.member-row-label[data-symbol-name="${CSS.escape(token)}"]`,
    );
    if (label?.isConnected) return label;
  }

  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-flow-node-id="${CSS.escape(flowNodeId)}"] [data-member-id="${CSS.escape(memberId)}"] .member-row-label[data-symbol-name="${CSS.escape(token)}"]`,
  );
}

export function findClassDefLabel(flowNodeId: string, token: string): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-flow-node-id="${CSS.escape(flowNodeId)}"] .node-card-title[data-symbol-name="${CSS.escape(token)}"]`,
  );
}

function usageChipInGraph(
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  token: string,
): HTMLElement | null {
  const traceKey = makeUsageTokenKey(flowNodeId, memberId, lineNumber, token);
  const fromRegistry = getByTraceKey(traceKey);
  if (fromRegistry) return fromRegistry;

  const pane = graphPane();
  if (!pane) return null;
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}

/** Finest usage anchor for current reveal level (class → member → line chip). */
export function resolveUsageSiteAnchor(
  flowNodeId: string,
  classData: ClassNodeData,
  memberId: string,
  lineNumber: number,
  token: string,
): AnchorRef {
  const chip = usageChipInGraph(flowNodeId, memberId, lineNumber, token);
  if (chip?.isConnected) return { type: "element", el: chip };

  const bodyExpanded = !(classData.collapsed ?? false);
  if (!bodyExpanded) {
    return { type: "handle", handle: previewTargetTop(flowNodeId) };
  }

  const methodExpanded = classData.expandedMethodIds.includes(memberId);
  if (!methodExpanded) {
    return { type: "handle", handle: previewMemberHandle(memberId) };
  }

  return { type: "handle", handle: previewLineHandle(memberId, lineNumber) };
}

/** Finest definition anchor for current reveal level. */
export function resolveDefinitionSiteAnchor(
  token: string,
  flowNodeId: string,
  memberId: string | undefined,
  getNode: (id: string) => Node | undefined,
): AnchorRef {
  if (memberId) {
    const label = findMemberDefLabel(flowNodeId, memberId, token);
    if (label?.isConnected) return { type: "element", el: label };

    const classData = getClassNodeData(flowNodeId, getNode);
    if (!classData) {
      return { type: "handle", handle: previewMemberHandle(memberId) };
    }

    if (classData.collapsed ?? false) {
      return { type: "handle", handle: previewTargetTop(flowNodeId) };
    }

    if (!classData.expandedMethodIds.includes(memberId)) {
      return { type: "handle", handle: previewMemberHandle(memberId) };
    }

    const method = classData.methods.find((m) => m.id === memberId);
    const tokenRe = new RegExp(`\\b${escapeRegExp(token)}\\b`);
    if (method) {
      const lines = method.code.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!tokenRe.test(lines[i] ?? "")) continue;
        const lineNumber = i + 1;
        const chip = usageChipInGraph(flowNodeId, memberId, lineNumber, token);
        if (chip?.isConnected) return { type: "element", el: chip };
        return { type: "handle", handle: previewLineHandle(memberId, lineNumber) };
      }
    }

    return { type: "handle", handle: previewMemberHandle(memberId) };
  }

  const classLabel = findClassDefLabel(flowNodeId, token);
  if (classLabel?.isConnected) return { type: "element", el: classLabel };
  return { type: "handle", handle: previewTargetTop(flowNodeId) };
}

function resolveHint(
  hint: LiveAnchorHint,
  getNode: (id: string) => Node | undefined,
): AnchorRef {
  if (hint.role === "usage") {
    if (hint.traceKey) {
      const host = getByTraceKey(hint.traceKey);
      if (host?.isConnected) return { type: "element", el: host };
    }
    if (!hint.memberId || hint.lineNumber == null) {
      return { type: "handle", handle: previewMemberHandle(hint.memberId ?? "") };
    }
    const classData = getClassNodeData(hint.flowNodeId, getNode);
    if (!classData) {
      return { type: "handle", handle: previewMemberHandle(hint.memberId) };
    }
    return resolveUsageSiteAnchor(
      hint.flowNodeId,
      classData,
      hint.memberId,
      hint.lineNumber,
      hint.token,
    );
  }

  return resolveDefinitionSiteAnchor(
    hint.token,
    hint.flowNodeId,
    hint.memberId,
    getNode,
  );
}

/** True when `handle` is the current (refined) endpoint — not the stale static anchor. */
export function edgeTouchesHandle(
  edge: PreviewEdgeSpec,
  handle: string,
  getNode: (id: string) => Node | undefined,
): boolean {
  const { from, to } =
    edge.liveFrom || edge.liveTo
      ? refinePreviewEdge(edge, getNode)
      : { from: edge.from, to: edge.to };
  return (
    (from.type === "handle" && from.handle === handle) ||
    (to.type === "handle" && to.handle === handle)
  );
}

/** Re-resolve edge anchors each frame so wires track expand/collapse. */
export function refinePreviewEdge(
  spec: PreviewEdgeSpec,
  getNode: (id: string) => Node | undefined,
): { from: AnchorRef; to: AnchorRef } {
  const from = spec.liveFrom
    ? resolveHint(spec.liveFrom, getNode)
    : spec.from.type === "element" && !spec.from.el.isConnected
      ? spec.from
      : spec.from;

  const to = spec.liveTo
    ? resolveHint(spec.liveTo, getNode)
    : spec.to.type === "element" && !spec.to.el.isConnected
      ? spec.to
      : spec.to;

  return { from, to };
}
