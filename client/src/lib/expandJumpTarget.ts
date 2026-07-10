import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { layoutPreferenceFromData, resolveNodeHeight } from "@/lib/classNodeLayout";
import type { LiveAnchorHint } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";

type SetNodes = (updater: (nodes: Node[]) => Node[]) => void;

/**
 * Jump targets inside a collapsed class or an unexpanded method resolve to a
 * coarse node/member handle (see resolveLiveAnchor.ts) — nothing to actually
 * see. Un-collapse the class and expand the target member so the real
 * definition/usage line renders before the jump click scrolls to it.
 */
export function expandJumpTarget(
  hint: LiveAnchorHint | undefined,
  setNodes: SetNodes,
): void {
  if (!hint) return;

  setNodes((nodes) =>
    nodes.map((n) => {
      if (n.id !== hint.flowNodeId || n.type !== "class") return n;
      const data = n.data as ClassNodeData;

      const patch: Partial<ClassNodeData> = { collapsed: false };
      if (hint.memberId) {
        const isProperty = data.properties.some((m) => m.id === hint.memberId);
        const expandedKey = isProperty ? "expandedPropertyIds" : "expandedMethodIds";
        const current = data[expandedKey];
        if (!current.includes(hint.memberId)) {
          patch[expandedKey] = [...current, hint.memberId];
        }
        if (isProperty) patch.propertiesSectionCollapsed = false;
        else patch.methodsSectionCollapsed = false;
        patch.pinnedMemberIds = [...new Set([...(data.pinnedMemberIds ?? []), hint.memberId])];
      }

      const merged: ClassNodeData = { ...data, ...patch };
      patch.layoutPreference = layoutPreferenceFromData(merged);
      const nextHeight = resolveNodeHeight(merged, data.height);

      return {
        ...n,
        height: nextHeight,
        style: { ...n.style, height: nextHeight },
        data: { ...merged, height: nextHeight },
      };
    }),
  );
}
