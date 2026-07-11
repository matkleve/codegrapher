import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

/**
 * Cheap fingerprint of every class node's collapsed/expanded state. Used as a
 * memo dependency to force trace-lit/handle recomputation when a member or
 * class expands/collapses and reveals new DOM chips, even though the class
 * data itself isn't read inside those memos' bodies.
 */
export function useRevealRevision(nodes: Node[]): string {
  return useMemo(() => {
    const parts: string[] = [];
    for (const node of nodes) {
      if (node.type !== "class") continue;
      const data = node.data as ClassNodeData;
      parts.push(
        `${node.id}:${data.collapsed ? "c" : "o"}:${data.expandedMethodIds.join(",")}:${data.expandedPropertyIds.join(",")}`,
      );
    }
    return parts.join("|");
  }, [nodes]);
}
