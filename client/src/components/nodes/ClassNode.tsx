import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
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
    <div className="m-1 rounded-md bg-muted p-2">
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
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const onToggleMethod = useCallback(
    (methodId: string) => {
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id || n.type !== "class") return n;
          const d = n.data as ClassNodeData;
          const expanded = new Set(d.expandedMethodIds);
          if (expanded.has(methodId)) expanded.delete(methodId);
          else expanded.add(methodId);
          return {
            ...n,
            data: { ...d, expandedMethodIds: [...expanded] },
          };
        }),
      );
      requestAnimationFrame(() => updateNodeInternals(id));
    },
    [id, setNodes, updateNodeInternals],
  );

  return (
    <div
      className={cn(
        "min-w-[280px] rounded-lg border border-border bg-card shadow-sm",
        (selected || nodeData.selected) && "ring-2 ring-ring",
        nodeData.pathHighlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="rounded-t-lg border-b border-border bg-accent px-3 py-3">
        <p className="truncate text-sm font-bold text-accent-foreground">{nodeData.label}</p>
      </div>
      <div className="flex flex-col py-1">
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
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
