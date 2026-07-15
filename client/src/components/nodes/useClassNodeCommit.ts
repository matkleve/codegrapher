import { useCallback, useRef } from "react";
import { useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import {
  layoutPreferenceFromData,
} from "@/lib/classNodeLayout";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

export type CommitNode = (
  patch: Partial<ClassNodeData>,
  size?: { width: number; height?: number },
  opts?: { keepPreference?: boolean },
) => void;

/**
 * The single writer of a class node's data + dimensions. Every toggle and the
 * resizer funnel through here so width/height/style and React Flow's internals
 * stay in sync. `keepPreference` skips recording the layout preference (used by
 * resize, which must not overwrite the user's remembered open-set).
 */
export function useClassNodeCommit(
  id: string,
  nodeData: ClassNodeData,
  nodeWidth: number,
): CommitNode {
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const internalsRafRef = useRef(0);

  const scheduleNodeInternals = useCallback(() => {
    if (internalsRafRef.current) return;
    internalsRafRef.current = requestAnimationFrame(() => {
      internalsRafRef.current = 0;
      updateNodeInternals(id);
    });
  }, [id, updateNodeInternals]);

  const withPreference = useCallback(
    (patch: Partial<ClassNodeData>): Partial<ClassNodeData> => {
      if (patch.layoutPreference !== undefined) return patch;
      const merged = { ...nodeData, ...patch };
      return { ...patch, layoutPreference: layoutPreferenceFromData(merged) };
    },
    [nodeData],
  );

  return useCallback(
    (patch, size, opts) => {
      const nextPatch = opts?.keepPreference ? patch : withPreference(patch);
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id || n.type !== "class") return n;
          const prev = n.data as ClassNodeData;
          const nextData = { ...prev, ...nextPatch };
          const w = size?.width ?? nextData.width ?? nodeWidth;
          const h = size?.height ?? nextData.height;
          return {
            ...n,
            width: w,
            height: h,
            style: { ...n.style, width: w, ...(h != null ? { height: h } : {}) },
            data: { ...nextData, width: w, height: h },
          };
        }),
      );
      scheduleNodeInternals();
    },
    [id, nodeWidth, scheduleNodeInternals, setNodes, withPreference],
  );
}
