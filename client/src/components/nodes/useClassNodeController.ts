import { useRef } from "react";
import { useClassNodeCommit } from "@/components/nodes/useClassNodeCommit";
import { useClassNodeMembers } from "@/components/nodes/useClassNodeMembers";
import { useClassNodeResize } from "@/components/nodes/useClassNodeResize";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

type ClassNodeControllerArgs = {
  id: string;
  nodeData: ClassNodeData;
  nodeWidth: number;
  nodeHeight: number | undefined;
  bodyExpanded: boolean;
};

/**
 * Composes a class node's state logic: a single `commitNode` writer shared by
 * the member toggles and the snap-to-content resize. Keeps ClassNode.tsx a thin
 * render file.
 */
export function useClassNodeController({
  id,
  nodeData,
  nodeWidth,
  nodeHeight,
  bodyExpanded,
}: ClassNodeControllerArgs) {
  const cardRef = useRef<HTMLDivElement>(null);
  const commitNode = useClassNodeCommit(id, nodeData, nodeWidth);

  const members = useClassNodeMembers({
    nodeData,
    nodeWidth,
    nodeHeight,
    bodyExpanded,
    commitNode,
  });

  const resize = useClassNodeResize({
    nodeData,
    nodeWidth,
    nodeHeight,
    bodyExpanded,
    cardRef,
    commitNode,
  });

  return { cardRef, ...members, ...resize };
}
