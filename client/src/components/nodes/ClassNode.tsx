import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { CollapsibleMemberRow } from "@/components/nodes/CollapsibleMemberRow";
import { FileTypeChip } from "@/components/nodes/FileTypeChip";
import { NodeCardHeader } from "@/components/nodes/NodeCardHeader";
import { camelToWords } from "@/lib/camelToWords";
import { cn } from "@/lib/utils";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

function MemberSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-1">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </section>
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

  const onToggleProperty = useCallback(
    (propertyId: string) => {
      const expanded = new Set(nodeData.expandedPropertyIds);
      if (expanded.has(propertyId)) expanded.delete(propertyId);
      else expanded.add(propertyId);
      patchNodeData({ expandedPropertyIds: [...expanded] });
    },
    [nodeData.expandedPropertyIds, patchNodeData],
  );

  const onToggleCollapsed = useCallback(() => {
    patchNodeData({ collapsed: !collapsed });
  }, [collapsed, patchNodeData]);

  const title = camelToWords(nodeData.label);
  const hasProperties = nodeData.properties.length > 0;
  const hasMethods = nodeData.methods.length > 0;

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
        title={title}
        fileName={nodeData.fileName}
        chip={<FileTypeChip filePath={nodeData.filePath} />}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
      {!collapsed && (
        <div className="nodrag flex flex-col py-1">
          {hasProperties && (
            <MemberSection label="Properties">
              {nodeData.properties.map((p) => (
                <CollapsibleMemberRow
                  key={p.id}
                  memberId={p.id}
                  label={p.label}
                  code={p.code}
                  expanded={nodeData.expandedPropertyIds.includes(p.id)}
                  onToggle={onToggleProperty}
                />
              ))}
            </MemberSection>
          )}
          {hasProperties && hasMethods ? (
            <div className="mx-3 my-1 border-t border-border" role="separator" />
          ) : null}
          {hasMethods ? (
            <MemberSection label="Methods">
              {nodeData.methods.map((m) => (
                <CollapsibleMemberRow
                  key={m.id}
                  memberId={m.id}
                  label={m.label}
                  code={m.code}
                  expanded={nodeData.expandedMethodIds.includes(m.id)}
                  onToggle={onToggleMethod}
                />
              ))}
            </MemberSection>
          ) : null}
          {!hasProperties && !hasMethods ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No members</p>
          ) : null}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
