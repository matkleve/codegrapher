import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { NodeCardHeader } from "@/components/nodes/NodeCardHeader";
import { cn } from "@/lib/utils";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

const CODE_PREVIEW_LINES = 3;

function previewCode(code: string, maxLines: number): string {
  return code.split("\n").slice(0, maxLines).join("\n");
}

function MethodRow({
  methodId,
  label,
  code,
  expanded,
  onToggle,
}: {
  methodId: string;
  label: string;
  code: string;
  expanded: boolean;
  onToggle: (methodId: string) => void;
}) {
  const preview = previewCode(code, expanded ? 200 : CODE_PREVIEW_LINES);

  return (
    <div className="nodrag m-1 rounded-md bg-muted p-2">
      <button
        type="button"
        className="w-full cursor-pointer text-left text-sm font-mono font-medium text-foreground hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(methodId);
        }}
      >
        {label}
      </button>
      {code.trim() ? (
        <pre
          className={cn(
            "mt-1.5 overflow-hidden whitespace-pre-wrap font-mono text-xs text-muted-foreground",
            !expanded && "line-clamp-3",
          )}
        >
          {preview}
        </pre>
      ) : null}
    </div>
  );
}

function ClassNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ClassNodeData;
  const collapsed = nodeData.collapsed ?? false;
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const patchNodeData = useCallback(
    (patch: Partial<ClassNodeData>) => {
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id || n.type !== "class") return n;
          return { ...n, data: { ...(n.data as ClassNodeData), ...patch } };
        }),
      );
      requestAnimationFrame(() => updateNodeInternals(id));
    },
    [id, setNodes, updateNodeInternals],
  );

  const onToggleMethod = useCallback(
    (methodId: string) => {
      const expanded = new Set(nodeData.expandedMethodIds);
      if (expanded.has(methodId)) expanded.delete(methodId);
      else expanded.add(methodId);
      patchNodeData({ expandedMethodIds: [...expanded] });
    },
    [nodeData.expandedMethodIds, patchNodeData],
  );

  const onToggleCollapsed = useCallback(() => {
    patchNodeData({ collapsed: !collapsed });
  }, [collapsed, patchNodeData]);

  const subtitle =
    nodeData.nodeKind === "class" && nodeData.label !== nodeData.fileName
      ? nodeData.label
      : undefined;

  return (
    <div
      className={cn(
        "min-w-[280px] rounded-lg border border-border bg-card shadow-sm",
        (selected || nodeData.selected) && "ring-2 ring-ring",
        nodeData.pathHighlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <NodeCardHeader
        fileName={nodeData.fileName}
        subtitle={subtitle}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
      {!collapsed && (
        <div className="nodrag flex flex-col py-1">
          {nodeData.methods.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No members</p>
          ) : (
            nodeData.methods.map((m) => (
              <MethodRow
                key={m.id}
                methodId={m.id}
                label={m.label}
                code={m.code}
                expanded={nodeData.expandedMethodIds.includes(m.id)}
                onToggle={onToggleMethod}
              />
            ))
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
