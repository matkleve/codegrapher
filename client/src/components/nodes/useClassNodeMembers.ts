import { useCallback } from "react";
import {
  computeClassNodeHeight,
  resolveNodeHeight,
} from "@/lib/classNodeLayout";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { CommitNode } from "@/components/nodes/useClassNodeCommit";

type MemberKind = "property" | "method";

const EXPANDED_KEY = {
  property: "expandedPropertyIds",
  method: "expandedMethodIds",
} as const;

const SECTION_KEY = {
  property: "propertiesSectionCollapsed",
  method: "methodsSectionCollapsed",
} as const;

type ClassNodeMembersArgs = {
  nodeData: ClassNodeData;
  nodeWidth: number;
  nodeHeight: number | undefined;
  bodyExpanded: boolean;
  commitNode: CommitNode;
};

/** Open/close of individual members, whole sections, and bulk open/close. */
export function useClassNodeMembers({
  nodeData,
  nodeWidth,
  nodeHeight,
  bodyExpanded,
  commitNode,
}: ClassNodeMembersArgs) {
  const toggleMember = useCallback(
    (memberId: string, kind: MemberKind) => {
      const expandedKey = EXPANDED_KEY[kind];
      const expanded = new Set(nodeData[expandedKey]);
      const pinned = new Set(nodeData.pinnedMemberIds ?? []);
      const opening = !expanded.has(memberId);

      if (opening) {
        expanded.add(memberId);
        pinned.add(memberId);
      } else {
        expanded.delete(memberId);
        pinned.delete(memberId);
      }

      const patch: Partial<ClassNodeData> = {
        pinnedMemberIds: [...pinned],
        [expandedKey]: [...expanded],
        [SECTION_KEY[kind]]: false,
      };
      const merged: ClassNodeData = { ...nodeData, ...patch };
      const nextHeight = opening
        ? resolveNodeHeight(merged, nodeHeight ?? undefined)
        : computeClassNodeHeight(merged);
      commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
    },
    [commitNode, nodeData, nodeHeight, nodeWidth],
  );

  const toggleSection = useCallback(
    (kind: MemberKind, collapsing: boolean) => {
      const patch: Partial<ClassNodeData> = {
        [SECTION_KEY[kind]]: collapsing,
        ...(collapsing ? { [EXPANDED_KEY[kind]]: [] } : {}),
      };
      const merged = { ...nodeData, ...patch };
      const nextHeight = collapsing
        ? computeClassNodeHeight(merged)
        : resolveNodeHeight(merged, nodeHeight ?? undefined);
      commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
    },
    [commitNode, nodeData, nodeHeight, nodeWidth],
  );

  const bulkToggle = useCallback(
    (kind: MemberKind, anyExpanded: boolean) => {
      const members = kind === "property" ? nodeData.properties : nodeData.methods;
      const others = kind === "property" ? nodeData.methods : nodeData.properties;
      const expandedKey = EXPANDED_KEY[kind];

      if (anyExpanded) {
        const pinned = (nodeData.pinnedMemberIds ?? []).filter((pid) =>
          others.some((m) => m.id === pid),
        );
        const merged: ClassNodeData = { ...nodeData, [expandedKey]: [], pinnedMemberIds: pinned };
        const h = computeClassNodeHeight(merged);
        commitNode(
          { [expandedKey]: [], pinnedMemberIds: pinned, height: h },
          { width: nodeWidth, height: h },
        );
        return;
      }

      const memberIds = members.map((m) => m.id);
      const pinned = [...new Set([...(nodeData.pinnedMemberIds ?? []), ...memberIds])];
      const patch: Partial<ClassNodeData> = {
        [SECTION_KEY[kind]]: false,
        [expandedKey]: memberIds,
        pinnedMemberIds: pinned,
      };
      const merged: ClassNodeData = { ...nodeData, ...patch };
      const nextHeight = resolveNodeHeight(merged, nodeHeight ?? undefined);
      commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
    },
    [commitNode, nodeData, nodeHeight, nodeWidth],
  );

  const onToggleCollapsed = useCallback(() => {
    const patch: Partial<ClassNodeData> = { collapsed: bodyExpanded };
    const nextHeight = computeClassNodeHeight({ ...nodeData, ...patch });
    commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
  }, [bodyExpanded, commitNode, nodeData, nodeWidth]);

  const propertiesSectionExpanded = !(nodeData.propertiesSectionCollapsed ?? false);
  const methodsSectionExpanded = !(nodeData.methodsSectionCollapsed ?? false);
  const anyPropertiesExpanded = nodeData.expandedPropertyIds.length > 0;
  const anyMethodsExpanded = nodeData.expandedMethodIds.length > 0;

  return {
    propertiesSectionExpanded,
    methodsSectionExpanded,
    anyPropertiesExpanded,
    anyMethodsExpanded,
    onToggleMethod: useCallback((mid: string) => toggleMember(mid, "method"), [toggleMember]),
    onToggleProperty: useCallback((pid: string) => toggleMember(pid, "property"), [toggleMember]),
    onToggleCollapsed,
    onTogglePropertiesSection: useCallback(
      () => toggleSection("property", propertiesSectionExpanded),
      [propertiesSectionExpanded, toggleSection],
    ),
    onToggleMethodsSection: useCallback(
      () => toggleSection("method", methodsSectionExpanded),
      [methodsSectionExpanded, toggleSection],
    ),
    onBulkToggleProperties: useCallback(
      () => bulkToggle("property", anyPropertiesExpanded),
      [anyPropertiesExpanded, bulkToggle],
    ),
    onBulkToggleMethods: useCallback(
      () => bulkToggle("method", anyMethodsExpanded),
      [anyMethodsExpanded, bulkToggle],
    ),
  };
}
