import {
  previewLineHandle,
  previewMemberHandle,
  previewTargetTop,
} from "@/lib/ctrlPreviewHandles";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { getByTraceKey } from "@/lib/elementRegistry";
import {
  memberDefSiblingHosts,
  resolveMemberDefEndpoint,
} from "@/lib/memberDefAnchor";
import { makeMemberDefKey } from "@/lib/traceKeys";
import { fileLineFromSnippetIndex } from "@/lib/memberFileLine";
import { parseUsageTokenKey } from "@/lib/traceKeys";
import type { AnchorRef, LiveAnchorHint, PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";
import {
  cfHostForTraceKey,
  findClassDefLabel,
  findMemberDefLabel,
  firstUsageChipOnLine,
  usageChipInGraph,
} from "@/lib/liveAnchorFinders";

export {
  cfHostForTraceKey,
  findClassDefLabel,
  findMemberDefLabel,
  firstUsageChipOnLine,
  usageChipInGraph,
} from "@/lib/liveAnchorFinders";

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

/** Finest usage anchor for current reveal level (class → member → line chip). */
export function resolveUsageSiteAnchor(
  flowNodeId: string,
  classData: ClassNodeData,
  memberId: string,
  lineNumber: number,
  tokenIndex: number | null,
  token: string,
): AnchorRef {
  const chip =
    (tokenIndex != null
      ? usageChipInGraph(flowNodeId, memberId, lineNumber, tokenIndex, token)
      : null) ?? firstUsageChipOnLine(flowNodeId, memberId, lineNumber, token);
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
    const defKey = makeMemberDefKey(flowNodeId, memberId);
    if (memberDefSiblingHosts(defKey)) {
      const endpoint = resolveMemberDefEndpoint(defKey);
      if (endpoint?.isConnected) return { type: "element", el: endpoint };
    }

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
      const startLine = method.startLine ?? 1;
      const lines = method.code.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!tokenRe.test(lines[i] ?? "")) continue;
        const lineNumber = fileLineFromSnippetIndex(startLine, i);
        const chip = firstUsageChipOnLine(flowNodeId, memberId, lineNumber, token);
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
  if (hint.traceKey) {
    const cfHost = cfHostForTraceKey(hint.traceKey);
    if (cfHost) return { type: "element", el: cfHost };

    const fromTraceKey = getByTraceKey(hint.traceKey);
    if (fromTraceKey?.isConnected) return { type: "element", el: fromTraceKey };

    const parsedUsage = parseUsageTokenKey(hint.traceKey);
    if (parsedUsage) {
      const usageChip = usageChipInGraph(
        parsedUsage.flowNodeId,
        parsedUsage.memberId,
        parsedUsage.lineNumber,
        parsedUsage.tokenIndex,
        parsedUsage.token,
      );
      if (usageChip?.isConnected) return { type: "element", el: usageChip };
    }
  }

  if (hint.role === "usage") {
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
      hint.tokenIndex ?? null,
      hint.token,
    );
  }

  if (hint.memberId && hint.lineNumber != null && hint.tokenIndex != null) {
    const chip = usageChipInGraph(
      hint.flowNodeId,
      hint.memberId,
      hint.lineNumber,
      hint.tokenIndex,
      hint.token,
    );
    if (chip?.isConnected) return { type: "element", el: chip };
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
